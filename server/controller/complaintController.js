import Complaint from '../models/complaintModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import ComplaintInvitation from '../models/complaintInvitationModel.js';
import Category from '../models/categoryModel.js';
import User from '../models/userModel.js';
import { DURATIONS, addTime } from '../utils/deadlineHelper.js';
import {
    ensureDefaultCategories,
    OTHER_CATEGORY_NAME
} from '../utils/categoryHelper.js';
import {
    assertTransition,
    canAuthorizeComplaintClose,
    canActAsCurrentHandler,
    findDepartmentHod,
    findInstitutionalDean,
    findViceChancellor,
    getListFilterForRole,
    isTerminalStatus,
    loadActor,
    recordComplaintLog,
    requiresInitialAcceptance,
    validateAssignTarget
} from '../utils/complaintWorkflowHelper.js';
import {
    COMPLAINT_DEPARTMENTS,
    isAllowedComplaintDepartment
} from '../constants/complaintDepartments.js';
import { applyHodStatusBucketToFilter } from '../utils/hodComplaintStatsHelper.js';
import {
    backfillVcDeanHandoffIfMissing,
    resolveDeanHandoffForVc
} from '../utils/vcRoutingDisplay.js';
import {
    canResolveComplaintContact,
    serializeComplaintForUser,
    filterLogsForViewer,
    filterActionAttachmentsOnComplaint
} from '../utils/complaintPrivacy.js';
import {
    complainantRecipientIds,
    createNotification,
    notifyActionRecipients,
    notifyComplaintTrackingStaff,
    notifyComplaintWatchers,
    notifyNewComplaintSubmitted,
    notifyUsers
} from '../utils/notificationHelper.js';
import { allocateComplaintPublicId } from '../utils/complaintPublicId.js';
import { validateRejectionPayload } from '../constants/complaintRejectionReasons.js';
import {
    mergeIntoComplaintAttachments,
    stampActionAttachments,
    validateActionAttachments
} from '../utils/complaintActionAttachments.js';
import {
    canJoinStoredComplaint,
    resolveComplaintAccess
} from '../utils/complaintAccess.js';
import {
    titleMentionsAssignee,
    titleMentionsGroupInvite,
    titleMentionsStatus,
    titleWithoutStatus
} from '../utils/complaintTitle.js';

const resolveActionAttachments = (
    body,
    complaint,
    actor,
    actionKey,
    intendedRecipientId
) => {
    const validation = validateActionAttachments(body?.attachments);
    if (!validation.ok) {
        return { error: validation.message };
    }
    if (!validation.files.length) {
        return { files: [], stamped: [] };
    }
    const stamped = stampActionAttachments(validation.files, actor, {
        intendedRecipient: intendedRecipientId,
        actionType: actionKey
    });
    mergeIntoComplaintAttachments(complaint, stamped, actionKey);
    return { files: validation.files, stamped };
};

// Helper: Check if user is authorized to access a private complaint
const recordId = (value) => {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || value.id || '');
    return String(value);
};

const isUserAuthorizedForComplaint = (complaint, user) => {
    if (complaint.visibility === 'public') return true;

    const userIdStr = String(user.id || user._id || '');
    const isCreator = recordId(complaint.raisedBy) === userIdStr;
    const isParticipant = complaint.participants?.some(
        (p) => recordId(p.student) === userIdStr
    );
    const isAssignee = recordId(complaint.currentAssignee) === userIdStr;
    const isAssigner = recordId(complaint.assignedBy) === userIdStr;
    const isDeptHOD =
        user.role === 'hod' &&
        departmentsAlign(user.department, complaint.department);
    const isAssignedAdvisor =
        user.role === 'advisor' && isAssignee;
    const isScopedDean =
        user.role === 'dean' &&
        (isAssignee || complaint.currentLevel === 'dean');
    const isScopedVc =
        user.role === 'super_admin' &&
        (isAssignee || complaint.currentLevel === 'vc');

    return (
        isCreator ||
        isParticipant ||
        isAssignee ||
        isAssigner ||
        isDeptHOD ||
        isAssignedAdvisor ||
        isScopedDean ||
        isScopedVc
    );
};

// ==================== 1. GET CATEGORIES ====================
const getCategories = async (req, res) => {
    try {
        await ensureDefaultCategories();
        let categories = await Category.find({ isActive: true })
            .select('name description targetDepartment initialLevel')
            .sort({ name: 1 })
            .lean();

        const otherRows = categories.filter(
            (row) => row.name === OTHER_CATEGORY_NAME
        );
        categories = categories.filter(
            (row) => row.name !== OTHER_CATEGORY_NAME
        );
        categories = [...categories, ...otherRows];

        res.json({ success: true, categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getComplaintDepartments = async (req, res) => {
    res.json({
        success: true,
        departments: COMPLAINT_DEPARTMENTS
    });
};

const getComplaintRoutingPreview = async (req, res) => {
    try {
        const department = (req.query.department || '').trim();
        const categoryId = req.query.categoryId;

        if (!department || !isAllowedComplaintDepartment(department)) {
            return res.status(400).json({
                success: false,
                message: 'A valid related department is required'
            });
        }

        const hod = await findDepartmentHod(department);
        if (!hod) {
            return res.json({
                success: true,
                found: false,
                level: 'hod',
                department
            });
        }

        return res.json({
            success: true,
            found: true,
            level: 'hod',
            assigneeName: hod.name,
            assigneeRole: 'hod',
            department
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message || 'Internal server error'
        });
    }
};

// ==================== 2. CREATE COMPLAINT ====================
const createComplaint = async (req, res) => {
    try {
        const {
            title,
            description,
            category,
            categoryId,
            department,
            location,
            incidentDate,
            preferredResolution,
            visibility = 'public',
            images,
            photos,
            attachments,
            undertaking,
            customCategoryName
        } = req.body;

        if (!undertaking) {
            return res.status(400).json({
                success: false,
                message: 'Undertaking must be accepted'
            });
        }

        if (!req.user || !req.user.id) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }

        // Fetch registered student details from MongoDB
        const student = await User.findById(req.user.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        if (student.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Only students can file complaints'
            });
        }

        const complainantRoll = String(student.rollNumber || '').trim();
        if (!/^\d{1,10}$/.test(complainantRoll)) {
            return res.status(400).json({
                success: false,
                message:
                    'Your registered roll number is required before a complaint ID can be issued'
            });
        }

        // Required text fields
        const shortTitle = String(title || '')
            .replace(/[\r\n\t]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        const titleWordCount = shortTitle ? shortTitle.split(' ').length : 0;
        if (!shortTitle) {
            return res.status(400).json({
                success: false,
                message: 'Complaint title is required'
            });
        }
        if (shortTitle.length > 60 || titleWordCount > 8) {
            return res.status(400).json({
                success: false,
                message:
                    'Use a short title of up to 8 words on one line'
            });
        }
        if (titleMentionsGroupInvite(shortTitle)) {
            return res.status(400).json({
                success: false,
                message: 'Do not mention a group invite in the title'
            });
        }
        if (titleMentionsAssignee(shortTitle)) {
            return res.status(400).json({
                success: false,
                message:
                    'Do not mention who the complaint is assigned to in the title'
            });
        }
        if (titleMentionsStatus(shortTitle)) {
            return res.status(400).json({
                success: false,
                message: 'Do not mention the complaint status in the title'
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Complaint description is required'
            });
        }

        const access = resolveComplaintAccess({
            complaintType: 'solo',
            visibility
        });
        if (!access.ok) {
            return res.status(400).json({
                success: false,
                message: access.message
            });
        }
        const finalComplaintType = access.complaintType;
        const finalVisibility = access.visibility;

        // Validate and resolve Category and Department routing
        await ensureDefaultCategories();
        let categoryDoc = null;
        if (categoryId) {
            categoryDoc = await Category.findOne({
                _id: categoryId,
                isActive: true
            });
        }
        if (!categoryDoc && category) {
            categoryDoc = await Category.findOne({
                name: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
                isActive: true
            });
        }

        if (!categoryDoc) {
            return res.status(400).json({
                success: false,
                message: 'Valid active complaint category is required'
            });
        }

        let finalCategory = categoryDoc.name;
        if (
            categoryDoc.name.toLowerCase() ===
            OTHER_CATEGORY_NAME.toLowerCase()
        ) {
            const custom = String(customCategoryName || '').trim();
            if (!custom) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Please specify a complaint category when Other is selected'
                });
            }
            if (custom.length > 120) {
                return res.status(400).json({
                    success: false,
                    message:
                        'Custom category must be 120 characters or fewer'
                });
            }
            finalCategory = custom;
        }
        const finalDepartment = (department || '').trim();

        if (!isAllowedComplaintDepartment(finalDepartment)) {
            return res.status(400).json({
                success: false,
                message:
                    'A valid related department is required. Choose one of the listed university departments.'
            });
        }

        // Student complaints always route to the HOD of the selected department
        // (e.g. CSE complaint → CSE HOD), not Dean/VC by category.
        const hod = await findDepartmentHod(finalDepartment);

        if (!hod) {
            return res.status(422).json({
                success: false,
                message: `No active HOD found for department "${finalDepartment}". Complaint cannot be routed.`,
                routingIssue: {
                    department: finalDepartment,
                    expectedRole: 'hod'
                }
            });
        }

        const initialLevel = 'hod';
        const currentLevel = 'hod';
        const currentAssignee = hod._id;

        // Construct server-controlled student profile snapshot
        const studentProfile = {
            name: student.name,
            email: student.email,
            phone: student.phone || '',
            rollNumber: student.rollNumber || '',
            department: student.department || '',
            semester: student.semester || null,
            section: student.section || '',
            programme: student.programme || '',
            batch: student.batch || '',
            advisor: student.assignedAdvisor || student.advisor || ''
        };

        // Attachments & images
        const complaintImages = Array.isArray(images)
            ? images
            : Array.isArray(photos)
            ? photos
            : [];
        const complaintAttachments = Array.isArray(attachments)
            ? attachments
            : [];
        const imagePayloadBytes = complaintImages.reduce(
            (sum, item) => sum + String(item || '').length,
            0
        );
        if (imagePayloadBytes > 8 * 1024 * 1024) {
            return res.status(413).json({
                success: false,
                message:
                    'The complaint is too large. Remove an image or use a smaller photo, then submit again.'
            });
        }

        // Participants setup: creator is the first confirmed participant
        const participants = [
            {
                student: student._id,
                name: student.name,
                rollNumber: student.rollNumber || '',
                joinedAt: new Date()
            }
        ];

        const publicId = await allocateComplaintPublicId(complainantRoll);

        const complaint = new Complaint({
            publicId,
            raisedBy: student._id,
            raisedByName: student.name,
            studentProfile,
            category: finalCategory,
            categoryId: categoryDoc._id,
            department: finalDepartment,
            title: shortTitle,
            description: description.trim(),
            location: location ? location.trim() : '',
            incidentDate: incidentDate ? new Date(incidentDate) : null,
            preferredResolution: preferredResolution
                ? preferredResolution.trim()
                : '',
            priority: 'medium',
            complaintType: finalComplaintType,
            visibility: finalVisibility,
            isGroupComplaint: finalComplaintType === 'group',
            groupMembers: [student._id],
            participants,
            participantCount: 1,
            images: complaintImages,
            attachments: complaintAttachments,
            initialLevel,
            currentLevel,
            currentAssignee,
            assignedBy: null,
            status: 'submitted',
            undertaking: true,
            Date: new Date(),
            deadline: addTime(DURATIONS.OVERALL),
            levelDeadline: addTime(DURATIONS.HOD)
        });

        await complaint.save();

        await notifyNewComplaintSubmitted({
            complaint,
            student,
            routedAssigneeId: currentAssignee
        });

        await recordComplaintLog({
            complaintId: complaint._id,
            actor: student,
            previousStatus: null,
            newStatus: 'submitted',
            previousAssignee: null,
            newAssignee: currentAssignee,
            level: currentLevel,
            action: 'submitted',
            remarks: `Complaint ${complaint.publicId} submitted by ${student.name} (${finalComplaintType}, ${finalVisibility}); routed to ${currentLevel}`
        });

        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            complaint
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 3. GET COMPLAINTS (WITH VISIBILITY FILTERING) ====================
const getComplaints = async (req, res) => {
    try {
        const { role, id } = req.user;
        const {
            page = 1,
            limit = 10,
            status,
            category,
            complaintType,
            visibility,
            myComplaints,
            publicFeed,
            raisedOnly
        } = req.query;

        const user = await User.findById(id).select('department role isActive');

        if (!user?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        let filter = {};

        if (role === 'student') {
            if (publicFeed === 'true') {
                filter = {
                    visibility: 'public',
                    status: { $ne: 'withdrawn' }
                };
            } else if (myComplaints === 'true') {
                if (raisedOnly === 'true') {
                    filter = { raisedBy: id };
                } else {
                    filter = {
                        $or: [
                            { raisedBy: id },
                            { 'participants.student': id }
                        ]
                    };
                }
            } else {
                filter = {
                    $or: [
                        {
                            visibility: 'public',
                            status: { $ne: 'withdrawn' }
                        },
                        {
                            visibility: 'private',
                            $or: [
                                { raisedBy: id },
                                { 'participants.student': id }
                            ]
                        }
                    ]
                };
            }
        } else {
            const roleFilter = getListFilterForRole(
                role,
                id,
                user.department
            );

            if (roleFilter?._id === null) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to list complaints'
                });
            }

            filter = roleFilter;
        }

        if (status) {
            if (
                role === 'hod' ||
                role === 'dean' ||
                role === 'super_admin' ||
                role === 'student'
            ) {
                applyHodStatusBucketToFilter(filter, status);
            } else {
                filter.status = status;
            }
        }
        if (category) filter.category = category;
        if (complaintType) filter.complaintType = complaintType;
        if (visibility) filter.visibility = visibility;

        const complaints = await Complaint.find(filter)
            .select(
                'publicId title status currentLevel department category complaintType visibility participantCount raisedByName createdAt'
            )
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        for (const row of complaints) {
            row.title = titleWithoutStatus(row.title);
        }

        const total = await Complaint.countDocuments(filter);

        res.json({
            success: true,
            complaints,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / Number(limit))
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 4. GET COMPLAINT BY ID (WITH PRIVATE ACCESS GUARD) ====================
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('raisedBy', 'name email rollNumber department')
            .populate('currentAssignee', 'name email role department')
            .populate('assignedBy', 'name email role department')
            .populate('resolvedBy', 'name email role department')
            .populate('closedBy', 'name email role department')
            .populate('closureAuthorizedHod', 'name email role department')
            .populate(
                'participants.student',
                'name rollNumber department semester section'
            );

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const user = await User.findById(req.user.id).select('department role');
        const userContext = {
            id: req.user.id,
            role: req.user.role,
            department: user?.department
        };

        // Enforce private complaint access control
        if (!isUserAuthorizedForComplaint(complaint, userContext)) {
            return res.status(403).json({
                success: false,
                message:
                    'Access denied. You are not authorized to view this private complaint.'
            });
        }

        let logs = await ComplaintLog.find({ complaint: complaint._id })
            .populate('actor', 'name role')
            .populate('newAssignee', 'name role')
            .populate('previousAssignee', 'name role')
            .populate('actionRecipient', 'name role')
            .sort({
                createdAt: 1
            });

        // Invitations are visible to creator and staff
        let invitations = [];
        const isCreator =
            complaint.raisedBy?._id?.toString() === req.user.id ||
            complaint.raisedBy?.toString() === req.user.id;
        const isStaff = ['advisor', 'hod', 'dean', 'super_admin'].includes(
            req.user.role
        );

        const isParticipant = (complaint.participants || []).some((p) => {
            const sid = p.student?._id?.toString() || p.student?.toString();
            return sid === req.user.id;
        });
        if (
            complaint.status === 'withdrawn' &&
            !isCreator &&
            !isStaff &&
            !isParticipant
        ) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (isCreator || isStaff) {
            invitations = await ComplaintInvitation.find({
                complaint: complaint._id
            }).sort({ createdAt: -1 });
        }

        let serialized = serializeComplaintForUser(complaint, userContext);
        serialized = filterActionAttachmentsOnComplaint(
            serialized,
            userContext
        );

        let deanHandoffBy = await resolveDeanHandoffForVc(complaint, logs);
        if (!deanHandoffBy) {
            deanHandoffBy = await backfillVcDeanHandoffIfMissing(complaint);
            if (deanHandoffBy) {
                await complaint.populate(
                    'assignedBy',
                    'name email role department'
                );
                logs = await ComplaintLog.find({ complaint: complaint._id })
                    .populate('actor', 'name role')
                    .populate('newAssignee', 'name role')
                    .populate('previousAssignee', 'name role')
                    .populate('actionRecipient', 'name role')
                    .sort({ createdAt: 1 });
            }
        }
        if (deanHandoffBy) {
            serialized.deanHandoffBy = deanHandoffBy;
        }

        const visibleLogs = filterLogsForViewer(logs, userContext, complaint);

        res.json({
            success: true,
            complaint: serialized,
            logs: visibleLogs,
            invitations,
            canRevealContact: canResolveComplaintContact(
                userContext,
                complaint
            )
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const addComplaintComment = async (req, res) => {
    try {
        const text = String(req.body?.remarks || req.body?.comment || '').trim();
        if (!text) {
            return res.status(400).json({
                success: false,
                message: 'Comment text is required'
            });
        }
        if (text.length > 1000) {
            return res.status(400).json({
                success: false,
                message: 'Comment must be 1000 characters or fewer'
            });
        }

        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const user = await User.findById(req.user.id).select(
            'department role isActive name'
        );
        if (!user?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const userContext = {
            id: req.user.id,
            role: req.user.role,
            department: user.department
        };

        if (!isUserAuthorizedForComplaint(complaint, userContext)) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to comment on this complaint'
            });
        }

        await recordComplaintLog({
            complaintId: complaint._id,
            actor: user,
            previousStatus: complaint.status,
            newStatus: complaint.status,
            action: 'comment',
            remarks: text
        });

        const logs = await ComplaintLog.find({ complaint: complaint._id })
            .populate('actor', 'name role')
            .populate('newAssignee', 'name role')
            .populate('previousAssignee', 'name role')
            .populate('actionRecipient', 'name role')
            .sort({
                createdAt: 1
            });

        return res.status(201).json({
            success: true,
            message: 'Comment added',
            logs
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const getComplaintContact = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id)
            .populate('raisedBy', 'name email phone rollNumber department')
            .populate('currentAssignee', 'name role department');

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const user = await User.findById(req.user.id).select(
            'department role isActive phone email'
        );
        if (!user?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const userContext = {
            id: req.user.id,
            role: req.user.role,
            department: user.department
        };

        if (!isUserAuthorizedForComplaint(complaint, userContext)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        if (!canResolveComplaintContact(userContext, complaint)) {
            return res.status(403).json({
                success: false,
                message:
                    'You are not authorized to view complainant contact details for this complaint'
            });
        }

        const raiser = await User.findById(complaint.raisedBy?._id || complaint.raisedBy)
            .select('name email phone rollNumber department semester section');

        await recordComplaintLog({
            complaintId: complaint._id,
            actor: user,
            action: 'contact_viewed',
            remarks: 'Complainant contact details viewed'
        });

        return res.json({
            success: true,
            contact: {
                name: raiser?.name || complaint.studentProfile?.name,
                email: raiser?.email || complaint.studentProfile?.email,
                phone:
                    raiser?.phone ||
                    complaint.studentProfile?.phone ||
                    '',
                rollNumber:
                    raiser?.rollNumber ||
                    complaint.studentProfile?.rollNumber,
                department:
                    raiser?.department ||
                    complaint.studentProfile?.department,
                semester: raiser?.semester ?? complaint.studentProfile?.semester,
                section:
                    raiser?.section || complaint.studentProfile?.section
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const getPublicComplaintStats = async (req, res) => {
    try {
        const [registered, resolved] = await Promise.all([
            Complaint.countDocuments({}),
            Complaint.countDocuments({ status: 'resolved' })
        ]);
        return res.json({
            success: true,
            stats: {
                registered,
                resolved
            }
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ==================== 5. GROUP INVITATIONS: INVITE STUDENT ====================
const inviteToComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id;
        const { rollNumber, urn } = req.body;
        const targetRollNumber = String(rollNumber || urn || '').trim();

        if (!targetRollNumber) {
            return res.status(400).json({
                success: false,
                message: 'Student roll number / URN is required'
            });
        }

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (complaint.complaintType !== 'group' || complaint.visibility !== 'public') {
            return res.status(400).json({
                success: false,
                message: 'Invitations are only supported for public group complaints'
            });
        }

        if (['resolved', 'rejected', 'withdrawn'].includes(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot invite participants to a resolved or rejected complaint'
            });
        }

        // Only complaint creator can invite participants
        if (complaint.raisedBy.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only the complaint creator can send invitations'
            });
        }

        // Look up target student in MongoDB
        const targetStudent = await User.findOne({
            rollNumber: targetRollNumber,
            role: 'student'
        });

        if (!targetStudent) {
            return res.status(404).json({
                success: false,
                message: `No registered student found with roll number ${targetRollNumber}`
            });
        }

        // Prevent self-invitation
        if (targetStudent._id.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'You cannot invite yourself to your own complaint'
            });
        }

        // Check if already a participant
        const alreadyParticipant = complaint.participants.some(
            (p) => p.student.toString() === targetStudent._id.toString()
        );
        if (alreadyParticipant) {
            return res.status(400).json({
                success: false,
                message: 'Student is already a participant in this complaint'
            });
        }

        // Check existing invitation status
        const existingInvite = await ComplaintInvitation.findOne({
            complaint: complaint._id,
            student: targetStudent._id
        });

        if (existingInvite) {
            if (existingInvite.status === 'pending') {
                return res.status(400).json({
                    success: false,
                    message: 'An invitation is already pending for this student'
                });
            }
            if (existingInvite.status === 'accepted') {
                return res.status(400).json({
                    success: false,
                    message: 'Student has already accepted participation'
                });
            }
            // If previously declined or cancelled, re-open invitation
            existingInvite.status = 'pending';
            existingInvite.invitedBy = req.user.id;
            existingInvite.respondedAt = null;
            await existingInvite.save();

            return res.status(200).json({
                success: true,
                message: 'Invitation re-sent successfully',
                invitation: existingInvite
            });
        }

        const invitation = await ComplaintInvitation.create({
            complaint: complaint._id,
            student: targetStudent._id,
            studentName: targetStudent.name,
            studentRollNumber: targetStudent.rollNumber,
            invitedBy: req.user.id,
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            message: 'Invitation sent successfully',
            invitation
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 6. GET MY INVITATIONS ====================
const getMyInvitations = async (req, res) => {
    try {
        const invitations = await ComplaintInvitation.find({
            student: req.user.id
        })
            .populate('complaint', 'title category department status raisedByName')
            .populate('invitedBy', 'name email')
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, invitations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 7. RESPOND TO INVITATION ====================
const respondToInvitation = async (req, res) => {
    try {
        const { invitationId } = req.params;
        const { action } = req.body; // 'accept' or 'decline'

        if (!['accept', 'decline'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be either 'accept' or 'decline'"
            });
        }

        const invitation = await ComplaintInvitation.findById(invitationId);
        if (!invitation) {
            return res.status(404).json({
                success: false,
                message: 'Invitation not found'
            });
        }

        if (invitation.student.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to respond to this invitation'
            });
        }

        if (invitation.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `Invitation is already ${invitation.status}`
            });
        }

        const complaint = await Complaint.findById(invitation.complaint);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Associated complaint not found'
            });
        }

        if (action === 'accept' && (complaint.complaintType !== 'group' || complaint.visibility !== 'public')) {
            return res.status(400).json({
                success: false,
                message: 'Only public group complaints can accept new members'
            });
        }

        if (['resolved', 'rejected', 'withdrawn'].includes(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot respond to invitation for a closed complaint'
            });
        }

        if (action === 'accept') {
            const student = await User.findById(req.user.id);
            const alreadyParticipant = complaint.participants.some(
                (p) => p.student.toString() === req.user.id
            );

            if (!alreadyParticipant) {
                complaint.participants.push({
                    student: student._id,
                    name: student.name,
                    rollNumber: student.rollNumber || '',
                    joinedAt: new Date()
                });

                if (!complaint.groupMembers.includes(student._id)) {
                    complaint.groupMembers.push(student._id);
                }

                complaint.participantCount = complaint.participants.length;
                await complaint.save();
            }

            invitation.status = 'accepted';
            invitation.respondedAt = new Date();
            await invitation.save();

            return res.json({
                success: true,
                message: 'Invitation accepted. You are now a participant.',
                participantCount: complaint.participantCount
            });
        } else {
            invitation.status = 'declined';
            invitation.respondedAt = new Date();
            await invitation.save();

            return res.json({
                success: true,
                message: 'Invitation declined'
            });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 8. JOIN PUBLIC GROUP COMPLAINT ====================
const joinComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const eligibility = canJoinStoredComplaint(complaint, req.user.id);
        if (!eligibility.ok) {
            return res.status(eligibility.status).json({
                success: false,
                message: eligibility.message
            });
        }

        const student = await User.findById(req.user.id);
        if (!student || student.role !== 'student' || !student.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Only active students can join a complaint'
            });
        }

        const updated = await Complaint.findOneAndUpdate(
            {
                _id: complaint._id,
                visibility: 'public',
                status: { $nin: ['resolved', 'rejected', 'withdrawn'] },
                raisedBy: { $ne: student._id },
                'participants.student': { $ne: student._id }
            },
            {
                $push: {
                    participants: {
                        student: student._id,
                        name: student.name,
                        rollNumber: student.rollNumber || '',
                        joinedAt: new Date()
                    }
                },
                $addToSet: { groupMembers: student._id }
            },
            { new: true }
        );

        const saved = updated || complaint;
        if (updated) {
            saved.participantCount = saved.participants.length;
            await saved.save();
            await ComplaintInvitation.findOneAndUpdate(
                {
                    complaint: complaint._id,
                    student: student._id,
                    status: 'pending'
                },
                { status: 'accepted', respondedAt: new Date() }
            );
        }

        res.json({
            success: true,
            alreadyMember: !updated,
            message: updated
                ? 'Joined this complaint'
                : 'You are already a participant in this complaint',
            participantCount: saved.participants.length,
            isMember: true
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 9. LEAVE GROUP COMPLAINT ====================
const leaveComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        // The primary creator cannot leave their own complaint
        if (complaint.raisedBy.toString() === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'The complaint creator cannot leave their own complaint'
            });
        }

        const participantIndex = complaint.participants.findIndex(
            (p) => p.student.toString() === req.user.id
        );

        if (participantIndex === -1) {
            return res.status(400).json({
                success: false,
                message: 'You are not a participant in this complaint'
            });
        }

        complaint.participants.splice(participantIndex, 1);
        complaint.groupMembers = complaint.groupMembers.filter(
            (id) => id.toString() !== req.user.id
        );
        complaint.participantCount = complaint.participants.length;
        await complaint.save();

        res.json({
            success: true,
            message: 'Left this complaint',
            participantCount: complaint.participantCount
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 9. WITHDRAW OWN COMPLAINT ====================
const withdrawComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        const isOwner =
            req.user.role === 'student' &&
            complaint.raisedBy.toString() === req.user.id;

        if (!isOwner) {
            return res.status(403).json({
                success: false,
                message:
                    'Only the student who filed this complaint can withdraw it'
            });
        }

        if (complaint.status === 'withdrawn') {
            return res.json({
                success: true,
                message: 'Complaint is already withdrawn'
            });
        }

        if (complaint.status === 'resolved') {
            return res.status(400).json({
                success: false,
                message: 'A resolved complaint cannot be withdrawn'
            });
        }

        const actor = await loadActor(req.user.id);
        const previousStatus = complaint.status;
        complaint.status = 'withdrawn';
        await complaint.save();

        await ComplaintInvitation.updateMany(
            { complaint: complaint._id, status: 'pending' },
            { status: 'declined', respondedAt: new Date() }
        );

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: 'withdrawn',
            previousAssignee: complaint.currentAssignee,
            newAssignee: complaint.currentAssignee,
            level: complaint.currentLevel,
            action: 'withdrawn',
            remarks: `Complaint ${complaint.publicId || ''} withdrawn by the student who filed it`.trim()
        });

        if (complaint.currentAssignee) {
            await createNotification({
                userId: complaint.currentAssignee,
                title: 'Complaint update',
                message: `The student withdrew complaint ${complaint.publicId || ''}`.trim(),
                type: 'complaint',
                relatedComplaint: complaint._id
            });
        }

        res.json({
            success: true,
            message: 'Complaint withdrawn'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 10. ASSIGN / FORWARD COMPLAINT ====================
const assignComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const { assignToId, remarks, reason } = req.body;
        const assignmentRemarks = (remarks || reason || '').trim();
        const assignerId = req.user.id;

        if (!assignToId) {
            return res.status(400).json({
                success: false,
                message: 'assignToId is required'
            });
        }

        const assigner = await loadActor(assignerId);

        if (!assigner?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        if (!['hod', 'dean'].includes(assigner.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to assign complaints'
            });
        }

        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (isTerminalStatus(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Closed complaints cannot be reassigned'
            });
        }

        if (requiresInitialAcceptance(complaint.status)) {
            return res.status(403).json({
                success: false,
                message:
                    'Accept the complaint before assigning, escalating, or resolving.'
            });
        }

        const transition = assertTransition('assign', complaint.status);

        if (!transition.ok) {
            return res.status(400).json({
                success: false,
                message: transition.message
            });
        }

        if (!canActAsCurrentHandler(complaint, assigner)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to assign this complaint'
            });
        }

        const targetValidation = await validateAssignTarget({
            complaint,
            assigner,
            assigneeId: assignToId
        });

        if (!targetValidation.ok) {
            return res.status(400).json({
                success: false,
                message: targetValidation.message
            });
        }

        const { assignee, nextLevel } = targetValidation;
        const previousStatus = complaint.status;
        const previousAssignee = complaint.currentAssignee;

        const duration =
            nextLevel === 'advisor'
                ? DURATIONS.ADVISOR
                : nextLevel === 'hod'
                ? DURATIONS.HOD
                : DURATIONS.DEAN;

        const attachmentResult = resolveActionAttachments(
            req.body,
            complaint,
            assigner,
            'assigned',
            assignee._id
        );
        if (attachmentResult.error) {
            return res.status(400).json({
                success: false,
                message: attachmentResult.error
            });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = assignee._id;
        complaint.assignedBy = assignerId;
        if (assigner.role === 'hod') {
            complaint.closureAuthorizedHod = assignerId;
        }
        if (
            assigner.role === 'dean' &&
            assignee.role === 'hod' &&
            assignee.department
        ) {
            complaint.department = assignee.department;
        }
        complaint.levelDeadline = addTime(duration);
        complaint.status = 'assigned';
        await complaint.save();

        await notifyActionRecipients({
            recipientIds: [assignee._id],
            complaint,
            actor: assigner,
            action: 'assigned',
            remarks: assignmentRemarks,
            attachmentCount: attachmentResult.stamped?.length || 0
        });

        await notifyComplaintTrackingStaff({
            complaint,
            actor: assigner,
            action: 'assigned',
            message: `${assigner.name} assigned complaint ${complaint.publicId || ''} to ${assignee.name} (${nextLevel}).`.trim()
        });

        await recordComplaintLog({
            complaintId: complaint._id,
            actor: assigner,
            previousStatus,
            newStatus: 'assigned',
            previousAssignee,
            newAssignee: assignee._id,
            level: nextLevel,
            action: 'assigned',
            remarks: assignmentRemarks,
            attachments: attachmentResult.stamped || [],
            actionRecipient: assignee._id
        });

        res.json({
            success: true,
            message: `Complaint assigned to ${assignee.name} (${nextLevel})`,
            complaint
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 11. ACCEPT / REJECT COMPLAINT ====================
const updateComplaintStatus = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const {
            action,
            remarks,
            reason,
            rejectionReasonCode,
            rejectionReasonOther
        } = req.body;

        if (!['accepted', 'rejected'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be 'accepted' or 'rejected'"
            });
        }

        const actor = await loadActor(req.user.id);

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (isTerminalStatus(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Complaint is already closed'
            });
        }

        const transition = assertTransition(action, complaint.status);

        if (!transition.ok) {
            return res.status(400).json({
                success: false,
                message: transition.message
            });
        }

        if (!canActAsCurrentHandler(complaint, actor)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to update this complaint'
            });
        }

        let note = '';
        let rejectionMeta = null;

        if (action === 'rejected') {
            const rejectionCheck = validateRejectionPayload({
                rejectionReasonCode,
                rejectionReasonOther,
                remarks: remarks || reason
            });
            if (!rejectionCheck.ok) {
                return res.status(400).json({
                    success: false,
                    message: rejectionCheck.message
                });
            }
            note = rejectionCheck.note;
            rejectionMeta = {
                rejectionReasonCode: rejectionCheck.rejectionReasonCode,
                rejectionReasonText: rejectionCheck.rejectionReasonText
            };
        } else {
            note = (remarks || reason || '').trim();
        }

        const previousStatus = complaint.status;

        complaint.status = action;
        if (rejectionMeta) {
            complaint.rejectionReasonCode = rejectionMeta.rejectionReasonCode;
            complaint.rejectionReasonText = rejectionMeta.rejectionReasonText;
        }
        await complaint.save();

        await notifyComplaintWatchers(complaint, {
            actorId: actor._id,
            title: 'Complaint update',
            message: complaint.publicId
                ? `Your complaint ${complaint.publicId} "${complaint.title}" is now ${action}.`
                : `Your complaint "${complaint.title}" is now ${action}.`
        });

        const publicId = complaint.publicId || String(complaint._id);
        const trackingMessage =
            action === 'rejected'
                ? `${actor.name} rejected complaint ${publicId}. ${note.slice(0, 180)}`
                : `${actor.name} accepted complaint ${publicId}.`;
        await notifyComplaintTrackingStaff({
            complaint,
            actor,
            action,
            message: trackingMessage
        });

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: action,
            previousAssignee: complaint.currentAssignee,
            newAssignee: complaint.currentAssignee,
            level: complaint.currentLevel,
            action,
            remarks: note
        });

        res.json({
            success: true,
            message: `Complaint ${action}`,
            complaint
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 12. ESCALATE / RETURN COMPLAINT ====================
const escalateComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const { remarks, reason, escalateToId } = req.body;
        const escalationRemarks = (remarks || reason || '').trim();

        const actor = await loadActor(req.user.id);

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (isTerminalStatus(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Closed complaints cannot be escalated'
            });
        }

        if (requiresInitialAcceptance(complaint.status)) {
            return res.status(403).json({
                success: false,
                message:
                    'Accept the complaint before assigning, escalating, or resolving.'
            });
        }

        const transition = assertTransition('escalate', complaint.status);

        if (!transition.ok) {
            return res.status(400).json({
                success: false,
                message: transition.message
            });
        }

        if (!canActAsCurrentHandler(complaint, actor)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to escalate this complaint'
            });
        }

        const previousStatus = complaint.status;
        const previousAssignee = complaint.currentAssignee;
        let nextLevel;
        let nextAssignee = null;
        let logAction = 'escalated';

        if (actor.role === 'advisor') {
            return res.status(403).json({
                success: false,
                message: 'Advisors cannot escalate or return complaints'
            });
        } else if (actor.role === 'hod') {
            const dean = await findInstitutionalDean();

            if (!dean) {
                return res.status(422).json({
                    success: false,
                    message: 'No active Dean available for escalation'
                });
            }

            if (
                escalateToId &&
                escalateToId.toString() !== dean._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'HOD may escalate only to the Dean'
                });
            }

            nextLevel = 'dean';
            nextAssignee = dean._id;
        } else if (actor.role === 'dean') {
            const vc = await findViceChancellor();

            if (!vc) {
                return res.status(422).json({
                    success: false,
                    message: 'No active Vice Chancellor available for escalation'
                });
            }

            if (
                escalateToId &&
                escalateToId.toString() !== vc._id.toString()
            ) {
                return res.status(403).json({
                    success: false,
                    message: 'Dean may escalate only to the Vice Chancellor'
                });
            }

            nextLevel = 'vc';
            nextAssignee = vc._id;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to escalate'
            });
        }

        const attachmentResult = resolveActionAttachments(
            req.body,
            complaint,
            actor,
            logAction,
            nextAssignee
        );
        if (attachmentResult.error) {
            return res.status(400).json({
                success: false,
                message: attachmentResult.error
            });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = nextAssignee;
        complaint.assignedBy = actor._id;
        if (actor.role === 'hod') {
            complaint.closureAuthorizedHod = actor._id;
        }
        complaint.levelDeadline =
            nextLevel === 'hod'
                ? addTime(DURATIONS.HOD)
                : nextLevel === 'dean'
                ? addTime(DURATIONS.DEAN)
                : addTime(DURATIONS.OVERALL);
        complaint.status = 'escalated';
        await complaint.save();

        await notifyActionRecipients({
            recipientIds: [nextAssignee],
            complaint,
            actor,
            action: logAction,
            remarks: escalationRemarks,
            attachmentCount: attachmentResult.stamped?.length || 0
        });

        await notifyComplaintTrackingStaff({
            complaint,
            actor,
            action: 'escalated',
            message: `${actor.name} escalated complaint ${complaint.publicId || ''}.`.trim()
        });

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: 'escalated',
            previousAssignee,
            newAssignee: nextAssignee,
            level: nextLevel,
            action: logAction,
            remarks: escalationRemarks,
            attachments: attachmentResult.stamped || [],
            actionRecipient: nextAssignee
        });

        res.json({
            success: true,
            message: `Complaint escalated to ${nextLevel}`,
            complaint
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 13. RESOLVE COMPLAINT ====================
const resolveComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const { remarks, resolutionNote } = req.body;
        const note = (remarks || resolutionNote || '').trim();

        if (!note) {
            return res.status(400).json({
                success: false,
                message: 'Resolution note is required'
            });
        }

        const actor = await loadActor(req.user.id);

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        if (!['advisor', 'hod', 'dean', 'super_admin'].includes(actor.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to resolve complaints'
            });
        }

        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (isTerminalStatus(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Complaint is already closed'
            });
        }

        if (requiresInitialAcceptance(complaint.status)) {
            return res.status(403).json({
                success: false,
                message:
                    'Accept the complaint before assigning, escalating, or resolving.'
            });
        }

        const transition = assertTransition('resolve', complaint.status);

        if (!transition.ok) {
            return res.status(400).json({
                success: false,
                message: transition.message
            });
        }

        if (!canActAsCurrentHandler(complaint, actor)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to resolve this complaint'
            });
        }

        const previousStatus = complaint.status;

        const complainantIds = complainantRecipientIds(complaint);
        const primaryRecipient =
            complainantIds[0] || recordId(complaint.raisedBy);

        const attachmentResult = resolveActionAttachments(
            req.body,
            complaint,
            actor,
            'resolved',
            primaryRecipient
        );
        if (attachmentResult.error) {
            return res.status(400).json({
                success: false,
                message: attachmentResult.error
            });
        }

        complaint.status = 'resolved';
        complaint.resolvedAt = new Date();
        complaint.resolutionNote = note;
        complaint.resolvedBy = actor._id;
        complaint.resolvedByName = actor.name || '';
        complaint.resolvedByRole = actor.role || '';
        await complaint.save();

        await notifyActionRecipients({
            recipientIds: complainantIds,
            complaint,
            actor,
            action: 'resolved',
            remarks: note,
            attachmentCount: attachmentResult.stamped?.length || 0
        });

        await notifyComplaintTrackingStaff({
            complaint,
            actor,
            action: 'resolved',
            message: `${actor.name} resolved complaint ${complaint.publicId || ''}.`.trim()
        });

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: 'resolved',
            previousAssignee: complaint.currentAssignee,
            newAssignee: complaint.currentAssignee,
            level: complaint.currentLevel,
            action: 'resolved',
            remarks: note,
            attachments: attachmentResult.stamped || [],
            actionRecipient: primaryRecipient
        });

        res.json({
            success: true,
            message: 'Complaint resolved',
            complaint
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 14. CLOSE COMPLAINT (HOD) ====================
const closeComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const actor = await loadActor(req.user.id);

        if (!actor?.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is inactive'
            });
        }

        if (actor.role !== 'hod') {
            return res.status(403).json({
                success: false,
                message: 'Only an authorized HOD can close this complaint'
            });
        }

        const complaint = await Complaint.findById(complaintId);

        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        if (complaint.status === 'closed') {
            return res.status(400).json({
                success: false,
                message: 'Complaint is already closed'
            });
        }

        const transition = assertTransition('close', complaint.status);
        if (!transition.ok) {
            return res.status(400).json({
                success: false,
                message: transition.message
            });
        }

        if (!canAuthorizeComplaintClose(complaint, actor)) {
            return res.status(403).json({
                success: false,
                message:
                    'You are not authorized to close this complaint. Only the HOD who assigned or escalated it may close it.'
            });
        }

        const previousStatus = complaint.status;
        complaint.status = 'closed';
        complaint.closedAt = new Date();
        complaint.closedBy = actor._id;
        complaint.closureType = 'manual';
        await complaint.save();

        const publicId = complaint.publicId || String(complaint._id);

        await notifyComplaintWatchers(complaint, {
            actorId: actor._id,
            title: 'Complaint closed',
            message: `Complaint ${publicId} was closed by ${actor.name}.`
        });

        const observerIds = [complaint.currentAssignee, complaint.resolvedBy].filter(
            Boolean
        );
        await notifyActionRecipients({
            recipientIds: observerIds,
            complaint,
            actor,
            action: 'closed',
            remarks: 'Complaint workflow completed.'
        });

        await notifyComplaintTrackingStaff({
            complaint,
            actor,
            action: 'closed',
            message: `${actor.name} closed complaint ${publicId}.`
        });

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: 'closed',
            previousAssignee: complaint.currentAssignee,
            newAssignee: complaint.currentAssignee,
            level: complaint.currentLevel,
            action: 'closed',
            remarks: `Complaint ${publicId} closed by ${actor.name}`
        });

        res.json({
            success: true,
            message: 'Complaint closed',
            complaint
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ==================== 15. AUTO-CLOSE RESOLVED COMPLAINTS ====================
const RESOLVED_AUTO_CLOSE_MS = 24 * 60 * 60 * 1000;

const handleResolvedAutoClose = async () => {
    const cutoff = new Date(Date.now() - RESOLVED_AUTO_CLOSE_MS);

    const candidates = await Complaint.find({
        status: 'resolved',
        resolvedAt: { $lte: cutoff }
    }).select('_id publicId title department currentAssignee currentLevel resolvedBy resolvedAt');

    let closedCount = 0;

    for (const doc of candidates) {
        const updated = await Complaint.findOneAndUpdate(
            {
                _id: doc._id,
                status: 'resolved',
                resolvedAt: { $lte: cutoff }
            },
            {
                $set: {
                    status: 'closed',
                    closedAt: new Date(),
                    closureType: 'automatic'
                }
            },
            { new: true }
        );

        if (!updated) continue;
        closedCount += 1;

        const publicId = updated.publicId || String(updated._id);

        await recordComplaintLog({
            complaintId: updated._id,
            actor: null,
            previousStatus: 'resolved',
            newStatus: 'closed',
            previousAssignee: updated.currentAssignee,
            newAssignee: updated.currentAssignee,
            level: updated.currentLevel,
            action: 'closed',
            remarks: `Complaint ${publicId} automatically closed 24 hours after resolution`
        });

        await notifyComplaintWatchers(updated, {
            title: 'Complaint closed',
            message: `Complaint ${publicId} was automatically closed after 24 hours.`
        });

        await notifyComplaintTrackingStaff({
            complaint: updated,
            actor: null,
            action: 'closed',
            message: `Complaint ${publicId} was automatically closed.`
        });
    }

    if (closedCount > 0) {
        console.log(
            `Auto-closed ${closedCount} resolved complaint(s) after 24 hours`
        );
    }

    return closedCount;
};

// ==================== 16. TIMEOUT / ESCALATION BACKGROUND WORKER ====================
const handleTimeouts = async () => {
    const now = new Date();

    const expiredComplaints = await Complaint.find({
        levelDeadline: { $lt: now },
        status: { $nin: ['resolved', 'closed', 'rejected', 'withdrawn'] }
    });

    for (const complaint of expiredComplaints) {
        const previousStatus = complaint.status;
        const previousAssignee = complaint.currentAssignee;
        let changed = false;

        if (complaint.currentLevel === 'advisor') {
            const hod = await findDepartmentHod(complaint.department);

            complaint.currentLevel = 'hod';
            complaint.currentAssignee =
                hod?._id || complaint.assignedBy || null;
            complaint.levelDeadline = addTime(DURATIONS.HOD);
            complaint.status = 'escalated';
            await complaint.save();

            await recordComplaintLog({
                complaintId: complaint._id,
                actor: null,
                previousStatus,
                newStatus: 'escalated',
                previousAssignee,
                newAssignee: complaint.currentAssignee,
                level: 'hod',
                action: 'escalated',
                remarks:
                    'Advisor has not solved the complaint within the deadline'
            });
            changed = true;
        } else if (complaint.currentLevel === 'hod') {
            const dean = await findInstitutionalDean();

            complaint.currentLevel = 'dean';
            complaint.currentAssignee = dean?._id || null;
            complaint.levelDeadline = addTime(DURATIONS.DEAN);
            complaint.status = 'escalated';
            await complaint.save();

            await recordComplaintLog({
                complaintId: complaint._id,
                actor: null,
                previousStatus,
                newStatus: 'escalated',
                previousAssignee,
                newAssignee: complaint.currentAssignee,
                level: 'dean',
                action: 'escalated',
                remarks:
                    'HOD has not solved the complaint within the deadline'
            });
            changed = true;
        } else if (complaint.currentLevel === 'dean') {
            const vc = await findViceChancellor();

            complaint.currentLevel = 'vc';
            complaint.currentAssignee = vc?._id || null;
            complaint.status = 'escalated';
            await complaint.save();

            await recordComplaintLog({
                complaintId: complaint._id,
                actor: null,
                previousStatus,
                newStatus: 'escalated',
                previousAssignee,
                newAssignee: complaint.currentAssignee,
                level: 'vc',
                action: 'escalated',
                remarks:
                    'Dean has not solved the complaint within the deadline — escalated to VC'
            });
            changed = true;
        }

        if (changed) {
            await notifyComplaintWatchers(complaint, {
                extraUserIds: [complaint.currentAssignee],
                title: 'Complaint update',
                message: complaint.publicId
                    ? `Complaint ${complaint.publicId} "${complaint.title}" was escalated.`
                    : `Complaint "${complaint.title}" was escalated.`
            });
        }
    }

    console.log(
        `Checked timeouts: ${expiredComplaints.length} complaints processed`
    );
};

export {
    getCategories,
    getComplaintDepartments,
    getComplaintRoutingPreview,
    getPublicComplaintStats,
    createComplaint,
    getComplaints,
    getComplaintById,
    getComplaintContact,
    addComplaintComment,
    inviteToComplaint,
    getMyInvitations,
    respondToInvitation,
    joinComplaint,
    leaveComplaint,
    withdrawComplaint,
    assignComplaint,
    updateComplaintStatus,
    escalateComplaint,
    resolveComplaint,
    closeComplaint,
    handleResolvedAutoClose,
    handleTimeouts
};