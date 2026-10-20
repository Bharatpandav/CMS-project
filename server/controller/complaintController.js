import Complaint from '../models/complaintModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import ComplaintInvitation from '../models/complaintInvitationModel.js';
import Category from '../models/categoryModel.js';
import User from '../models/userModel.js';
import { DURATIONS, addTime } from '../utils/deadlineHelper.js';
import { ensureDefaultCategories } from '../utils/categoryHelper.js';

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
    const isSuperAdminOrDean = ['super_admin', 'dean'].includes(user.role);
    const isDeptHOD =
        user.role === 'hod' && user.department === complaint.department;
    const isDeptAdvisor =
        user.role === 'advisor' &&
        (isAssignee || user.department === complaint.department);

    return (
        isCreator ||
        isParticipant ||
        isAssignee ||
        isAssigner ||
        isSuperAdminOrDean ||
        isDeptHOD ||
        isDeptAdvisor
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
        let finalDepartment = categoryDoc.targetDepartment;
        if (finalDepartment === 'Academic Affairs' && student.department) {
            finalDepartment = student.department;
        } else if (department && department.trim()) {
            finalDepartment = department.trim();
        }

        const initialLevel = categoryDoc.initialLevel || 'hod';

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
            advisor: student.advisor || ''
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
            currentLevel: initialLevel,
            status: 'pending',
            undertaking: true,
            Date: new Date(),
            deadline: addTime(DURATIONS.OVERALL),
            levelDeadline:
                initialLevel === 'dean'
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

        // Audit log
        await ComplaintLog.create({
            complaint: complaint._id,
            level: initialLevel,
            action: 'assigned',
            remarks: `Complaint submitted by ${student.name} (${finalComplaintType}, ${finalVisibility})`
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

        const user = await User.findById(id).select('department role');
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
                // Students see public complaints OR private complaints they created or participate in
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
        } else if (role === 'advisor') {
            // Advisors see complaints assigned to them, in their department, or public
            filter = {
                $or: [
                    { currentAssignee: id },
                    { assignedBy: id },
                    { department: user?.department },
                    { visibility: 'public' }
                ]
            };
        } else if (role === 'hod') {
            // HOD sees complaints in their department or assigned to them or public
            filter = {
                $or: [
                    { department: user?.department },
                    { currentAssignee: id },
                    { visibility: 'public' }
                ]
            };
        } else if (role === 'dean' || role === 'super_admin') {
            // Institutional leadership has oversight
            filter = {};
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

// ==================== 10. ASSIGN COMPLAINT (DEAN -> HOD, HOD -> ADVISOR) ====================
const assignComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const { assignToId } = req.body;
        const { role, id: assignerId } = req.user;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        let nextLevel;
        let duration; // FIXED: declared variable
        if (role === 'dean') {
            nextLevel = 'hod';
            duration = DURATIONS.HOD;
        } else if (role === 'hod') {
            nextLevel = 'advisor';
            duration = DURATIONS.ADVISOR;
        } else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to assign'
            });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = assignToId;
        complaint.assignedBy = assignerId;
        complaint.levelDeadline = addTime(duration);
        complaint.status = 'assigned';
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: nextLevel,
            assignedTo: assignToId,
            action: 'assigned'
        });

        res.json({
            success: true,
            message: `Complaint assigned to ${nextLevel}`,
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
        const { action, remarks } = req.body; // action: 'accepted' | 'rejected'

        if (!['accepted', 'rejected'].includes(action)) {
            return res.status(400).json({
                success: false,
                message: "Action must be 'accepted' or 'rejected'"
            });
        }

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        complaint.status = action;
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: complaint.currentLevel,
            assignedTo: complaint.currentAssignee,
            action,
            remarks
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

// ==================== 12. ESCALATE COMPLAINT ====================
const escalateComplaint = async (req, res) => {
    try {
        const complaintId = req.params.id || req.body.complaintId;
        const { remarks } = req.body;
        const { role } = req.user;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        let nextLevel;
        if (role === 'advisor') nextLevel = 'hod';
        else if (role === 'hod') nextLevel = 'dean';
        else {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to escalate'
            });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = null;
        complaint.status = 'escalated';
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: nextLevel,
            action: 'escalated',
            remarks
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
        const { remarks } = req.body;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        complaint.status = 'resolved';
        complaint.resolvedAt = new Date();
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: complaint.currentLevel,
            action: 'resolved',
            remarks
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
        if (complaint.currentLevel === 'advisor') {
            complaint.currentLevel = 'hod';
            complaint.currentAssignee = complaint.assignedBy;
            complaint.levelDeadline = addTime(DURATIONS.HOD);
            complaint.status = 'escalated';
            await complaint.save();

            await ComplaintLog.create({
                complaint: complaint._id,
                level: 'hod',
                action: 'escalated',
                remarks:
                    'Advisor has not solved the complaint within the deadline'
            });
        } else if (complaint.currentLevel === 'hod') {
            const dean = await User.findOne({ role: 'dean' });
            complaint.currentLevel = 'dean';
            complaint.currentAssignee = complaint.assignedBy || dean?._id || null;
            complaint.levelDeadline = addTime(DURATIONS.DEAN);
            complaint.status = 'escalated';
            await complaint.save();

            await ComplaintLog.create({
                complaint: complaint._id,
                level: 'dean',
                action: 'escalated',
                remarks:
                    'HOD has not solved the complaint within the deadline'
            });
        } else if (complaint.currentLevel === 'dean') {
            const vc = await User.findOne({ role: 'super_admin' });
            complaint.currentLevel = 'vc';
            complaint.currentAssignee = vc?._id || null;
            complaint.status = 'escalated';
            await complaint.save();

            await ComplaintLog.create({
                complaint: complaint._id,
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