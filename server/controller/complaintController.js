import Complaint from '../models/complaintModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import ComplaintInvitation from '../models/complaintInvitationModel.js';
import Category from '../models/categoryModel.js';
import User from '../models/userModel.js';
import { DURATIONS, addTime } from '../utils/deadlineHelper.js';
import { ensureDefaultCategories } from '../utils/categoryHelper.js';
import {
    assertTransition,
    canActAsCurrentHandler,
    findDepartmentHod,
    findInstitutionalDean,
    findViceChancellor,
    getListFilterForRole,
    isTerminalStatus,
    loadActor,
    recordComplaintLog,
    validateAssignTarget
} from '../utils/complaintWorkflowHelper.js';
import {
    COMPLAINT_DEPARTMENTS,
    isAllowedComplaintDepartment
} from '../constants/complaintDepartments.js';

// Helper: Check if user is authorized to access a private complaint
const isUserAuthorizedForComplaint = (complaint, user) => {
    if (complaint.visibility === 'public') return true;

    const userIdStr = user.id || user._id?.toString();
    const isCreator = complaint.raisedBy?.toString() === userIdStr;
    const isParticipant = complaint.participants?.some(
        (p) => p.student?.toString() === userIdStr
    );
    const isAssignee = complaint.currentAssignee?.toString() === userIdStr;
    const isAssigner = complaint.assignedBy?.toString() === userIdStr;
    const isDeptHOD =
        user.role === 'hod' && user.department === complaint.department;
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
        const categories = await Category.find({ isActive: true })
            .select('name description targetDepartment initialLevel')
            .sort({ name: 1 })
            .lean();

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
            priority,
            complaintType = 'solo',
            visibility = 'public',
            images,
            photos,
            attachments,
            undertaking,
            inviteRollNumbers,
            inviteUrns
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

        // Required text fields
        if (!title || !title.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Complaint title is required'
            });
        }

        if (!description || !description.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Complaint description is required'
            });
        }

        // Validate complaint type and visibility
        const finalComplaintType =
            complaintType === 'group' ? 'group' : 'solo';
        const finalVisibility =
            visibility === 'private' ? 'private' : 'public';

        // RULE: Private complaints must be solo; reject private-group
        if (finalVisibility === 'private' && finalComplaintType === 'group') {
            return res.status(400).json({
                success: false,
                message:
                    'Private complaints cannot be group complaints. Group complaints must be public.'
            });
        }

        // Validate Priority
        const validPriorities = ['low', 'medium', 'high', 'urgent'];
        const finalPriority = validPriorities.includes(priority)
            ? priority
            : 'medium';

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

        const finalCategory = categoryDoc.name;
        const finalDepartment = (department || '').trim();

        if (!isAllowedComplaintDepartment(finalDepartment)) {
            return res.status(400).json({
                success: false,
                message:
                    'A valid related department is required. Choose one of the listed university departments.'
            });
        }

        const initialLevel = categoryDoc.initialLevel || 'hod';

        let currentLevel = initialLevel;
        let currentAssignee = null;

        if (initialLevel === 'hod') {
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

            currentAssignee = hod._id;
            currentLevel = 'hod';
        } else {
            const dean = await findInstitutionalDean();

            if (!dean) {
                return res.status(422).json({
                    success: false,
                    message:
                        'No active Dean found. Complaint cannot be routed.',
                    routingIssue: {
                        department: finalDepartment,
                        expectedRole: 'dean'
                    }
                });
            }

            currentAssignee = dean._id;
            currentLevel = 'dean';
        }

        // Construct server-controlled student profile snapshot
        const studentProfile = {
            name: student.name,
            email: student.email,
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

        // Participants setup: creator is the first confirmed participant
        const participants = [
            {
                student: student._id,
                name: student.name,
                rollNumber: student.rollNumber || '',
                joinedAt: new Date()
            }
        ];

        const complaint = new Complaint({
            raisedBy: student._id,
            raisedByName: student.name,
            studentProfile,
            category: finalCategory,
            categoryId: categoryDoc._id,
            department: finalDepartment,
            title: title.trim(),
            description: description.trim(),
            location: location ? location.trim() : '',
            incidentDate: incidentDate ? new Date(incidentDate) : null,
            preferredResolution: preferredResolution
                ? preferredResolution.trim()
                : '',
            priority: finalPriority,
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
            levelDeadline:
                currentLevel === 'dean'
                    ? addTime(DURATIONS.DEAN)
                    : addTime(DURATIONS.HOD)
        });

        await complaint.save();

        // Handle initial group invitations if provided
        const invites = inviteRollNumbers || inviteUrns;
        if (
            finalComplaintType === 'group' &&
            Array.isArray(invites) &&
            invites.length > 0
        ) {
            for (const roll of invites) {
                const trimmedRoll = String(roll).trim();
                if (!trimmedRoll || trimmedRoll === student.rollNumber) {
                    continue;
                }

                const invitedStudent = await User.findOne({
                    rollNumber: trimmedRoll,
                    role: 'student'
                });

                if (invitedStudent) {
                    await ComplaintInvitation.create({
                        complaint: complaint._id,
                        student: invitedStudent._id,
                        studentName: invitedStudent.name,
                        studentRollNumber: invitedStudent.rollNumber,
                        invitedBy: student._id,
                        status: 'pending'
                    }).catch(() => {});
                }
            }
        }

        await recordComplaintLog({
            complaintId: complaint._id,
            actor: student,
            previousStatus: null,
            newStatus: 'submitted',
            previousAssignee: null,
            newAssignee: currentAssignee,
            level: currentLevel,
            action: 'submitted',
            remarks: `Complaint submitted by ${student.name} (${finalComplaintType}, ${finalVisibility}); routed to ${currentLevel}`
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
            myComplaints
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
            if (myComplaints === 'true') {
                filter = {
                    $or: [
                        { raisedBy: id },
                        { 'participants.student': id }
                    ]
                };
            } else {
                filter = {
                    $or: [
                        { visibility: 'public' },
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

        if (status) filter.status = status;
        if (category) filter.category = category;
        if (complaintType) filter.complaintType = complaintType;
        if (visibility) filter.visibility = visibility;

        const complaints = await Complaint.find(filter)
            .select(
                'title status currentLevel department category priority complaintType visibility participantCount raisedByName createdAt'
            )
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

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
            .populate('participants.student', 'name email rollNumber department');

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

        const logs = await ComplaintLog.find({ complaint: complaint._id }).sort({
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

        if (isCreator || isStaff) {
            invitations = await ComplaintInvitation.find({
                complaint: complaint._id
            }).sort({ createdAt: -1 });
        }

        res.json({ success: true, complaint, logs, invitations });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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

        if (complaint.complaintType !== 'group') {
            return res.status(400).json({
                success: false,
                message: 'Invitations are only supported for group complaints'
            });
        }

        if (['resolved', 'rejected'].includes(complaint.status)) {
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

        if (['resolved', 'rejected'].includes(complaint.status)) {
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

        if (
            complaint.complaintType !== 'group' ||
            complaint.visibility !== 'public'
        ) {
            return res.status(400).json({
                success: false,
                message: 'Only public group complaints can be joined'
            });
        }

        if (['resolved', 'rejected'].includes(complaint.status)) {
            return res.status(400).json({
                success: false,
                message: 'Cannot join a resolved or rejected complaint'
            });
        }

        const student = await User.findById(req.user.id);
        if (!student || student.role !== 'student') {
            return res.status(403).json({
                success: false,
                message: 'Only students can join group complaints'
            });
        }

        const alreadyParticipant = complaint.participants.some(
            (p) => p.student.toString() === req.user.id
        );
        if (alreadyParticipant) {
            return res.status(400).json({
                success: false,
                message: 'You are already a participant in this complaint'
            });
        }

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

        // Mark any pending invitation as accepted
        await ComplaintInvitation.findOneAndUpdate(
            { complaint: complaint._id, student: student._id, status: 'pending' },
            { status: 'accepted', respondedAt: new Date() }
        );

        res.json({
            success: true,
            message: 'Joined group complaint successfully',
            participantCount: complaint.participantCount
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
            message: 'Left group complaint successfully',
            participantCount: complaint.participantCount
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
        const assignmentReason = (remarks || reason || '').trim();
        const assignerId = req.user.id;

        if (!assignToId) {
            return res.status(400).json({
                success: false,
                message: 'assignToId is required'
            });
        }

        if (!assignmentReason) {
            return res.status(400).json({
                success: false,
                message: 'Assignment reason is required'
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

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = assignee._id;
        complaint.assignedBy = assignerId;
        complaint.levelDeadline = addTime(duration);
        complaint.status = 'assigned';
        await complaint.save();

        await recordComplaintLog({
            complaintId: complaint._id,
            actor: assigner,
            previousStatus,
            newStatus: 'assigned',
            previousAssignee,
            newAssignee: assignee._id,
            level: nextLevel,
            action: 'assigned',
            remarks: assignmentReason
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
        const { action, remarks, reason } = req.body;
        const note = (remarks || reason || '').trim();

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

        if (action === 'rejected' && !note) {
            return res.status(400).json({
                success: false,
                message: 'Rejection reason is required'
            });
        }

        const previousStatus = complaint.status;

        complaint.status = action;
        await complaint.save();

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
        const { remarks, reason } = req.body;
        const escalationReason = (remarks || reason || '').trim();

        if (!escalationReason) {
            return res.status(400).json({
                success: false,
                message: 'Escalation reason is required'
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
                message: 'Closed complaints cannot be escalated'
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
            const hod = await findDepartmentHod(complaint.department);

            if (!hod) {
                return res.status(422).json({
                    success: false,
                    message:
                        'Responsible department HOD not found; cannot return complaint'
                });
            }

            nextLevel = 'hod';
            nextAssignee = hod._id;
            logAction = 'returned';
        } else if (actor.role === 'hod') {
            const dean = await findInstitutionalDean();

            if (!dean) {
                return res.status(422).json({
                    success: false,
                    message: 'No active Dean available for escalation'
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

            nextLevel = 'vc';
            nextAssignee = vc._id;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to escalate'
            });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = nextAssignee;
        complaint.assignedBy = actor._id;
        complaint.levelDeadline =
            nextLevel === 'hod'
                ? addTime(DURATIONS.HOD)
                : nextLevel === 'dean'
                ? addTime(DURATIONS.DEAN)
                : addTime(DURATIONS.OVERALL);
        complaint.status = 'escalated';
        await complaint.save();

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: 'escalated',
            previousAssignee,
            newAssignee: nextAssignee,
            level: nextLevel,
            action: logAction,
            remarks: escalationReason
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

        complaint.status = 'resolved';
        complaint.resolvedAt = new Date();
        await complaint.save();

        await recordComplaintLog({
            complaintId: complaint._id,
            actor,
            previousStatus,
            newStatus: 'resolved',
            previousAssignee: complaint.currentAssignee,
            newAssignee: complaint.currentAssignee,
            level: complaint.currentLevel,
            action: 'resolved',
            remarks: note
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

// ==================== 14. TIMEOUT / ESCALATION BACKGROUND WORKER ====================
const handleTimeouts = async () => {
    const now = new Date();

    const expiredComplaints = await Complaint.find({
        levelDeadline: { $lt: now },
        status: { $nin: ['resolved', 'rejected'] }
    });

    for (const complaint of expiredComplaints) {
        const previousStatus = complaint.status;
        const previousAssignee = complaint.currentAssignee;

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
        }
    }

    console.log(
        `Checked timeouts: ${expiredComplaints.length} complaints processed`
    );
};

export {
    getCategories,
    getComplaintDepartments,
    createComplaint,
    getComplaints,
    getComplaintById,
    inviteToComplaint,
    getMyInvitations,
    respondToInvitation,
    joinComplaint,
    leaveComplaint,
    assignComplaint,
    updateComplaintStatus,
    escalateComplaint,
    resolveComplaint,
    handleTimeouts
};