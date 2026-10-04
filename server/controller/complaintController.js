import Complaint from '../models/complaintModel.js';
import ComplaintLog from '../models/complaintLogs.js';
import User from '../models/userModel.js';

// 1. Create complaint (student)
const createComplaint = async (req, res) => {
    try {
        const {
            title, description, department, photos,
            initialLevel, isGroupComplaint, groupMembers,
            undertaking, Date
        } = req.body;

        if (!undertaking) {
            return res.status(400).json({ success: false, message: 'Undertaking must be accepted' });
        }

        const user = await User.findById(req.user.id);

        const complaint = new Complaint({
            raisedBy: req.user.id,
            raisedByName: user.name,
            title,
            description,
            department,
            photos,
            isGroupComplaint,
            groupMembers,
            initialLevel,
            currentLevel: initialLevel,
            undertaking,
            Date,
            deadline: addTime(DURATIONS.OVERALL),
            levelDeadline: initialLevel === 'dean' ? addTime(DURATIONS.DEAN): addTime(DURATIONS.HOD)    
        });

        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: initialLevel,
            action: 'assigned',
            remarks: 'Complaint raised by student',
        });

        res.status(201).json({ success: true, message: 'Complaint submitted', complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Get complaints - role-based filtering
const getComplaints = async (req, res) => {
    try {
        const { role, id } = req.user;
        const { page = 1, limit = 10, status } = req.query;

        let filter = {};

        if (role === 'student') {
            filter.raisedBy = id;
        } else if (role === 'advisor' || role === 'hod') {
            filter.currentAssignee = id;
        } else if (role === 'dean' || role === 'super_admin') {} // No filter for dean and super_admin

        if (status) filter.status = status;

        const complaints = await Complaint.find(filter)
            .select('title status currentLevel department raisedByName createdAt')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(Number(limit))
            .lean();

        const total = await Complaint.countDocuments(filter);

        res.json({ success: true, complaints, total, page: Number(page) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 3. Get single complaint with full detail and history
const getComplaintById = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id).populate('raisedBy', 'name email');
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        const logs = await ComplaintLog.find({ complaint: complaint._id }).sort({ createdAt: 1 });

        res.json({ success: true, complaint, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. Assign complaint (Dean --> HOD, HOD --> Advisor)
const assignComplaint = async (req, res) => {
    try {
        const { complaintId, assignToId } = req.body;
        const { role, id: assignerId } = req.user;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        let nextLevel;
        if (role === 'dean') {
            nextLevel = 'hod';
            duration = DURATIONS.HOD;
        }
        else if (role === 'hod') {
            nextLevel = 'advisor'
            duration = DURATIONS.ADVISOR;
        }
        else {
            return res.status(403).json({ success: false, message: 'Not authorized to assign' });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = assignToId;
        complaint.assignedBy = assignerId; // Return to assigner if timeout occurs
        complaint.levelDeadline = addTime(duration);
        complaint.status = 'assigned';
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: nextLevel,
            assignedTo: assignToId,
            action: 'assigned',
        });

        res.json({ success: true, message: `Complaint assigned to ${nextLevel}`, complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. Accept/Reject complaint
const updateComplaintStatus = async (req, res) => {
    try {
        const { complaintId, action, remarks } = req.body; // action: 'accepted' | 'rejected'

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        complaint.status = action;
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: complaint.currentLevel,
            assignedTo: complaint.currentAssignee,
            action,
            remarks,
        });

        res.json({ success: true, message: `Complaint ${action}`, complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
// 6. Handle timeouts and escalate complaints
const handleTimeouts = async () => {
    const now = new Date();

    const expiredComplaints = await Complaint.find({
        levelDeadline: { $lt: now }, // Deadline crossed of current level  
        status: { $nin: ['resolved', 'rejected'] }, // Ignore already resolved or rejected complaints
    });

    for (const complaint of expiredComplaints) {
        if (complaint.currentLevel === 'advisor') {
            // Advisor timeouts then reassign to HOD
            complaint.currentLevel = 'hod';
            complaint.currentAssignee = complaint.assignedBy;
            complaint.levelDeadline = addTime(DURATIONS.HOD);
            complaint.status = 'escalated';
            await complaint.save();

            await ComplaintLog.create({
                complaint: complaint._id,
                level: 'hod',
                action: 'escalated',
                remarks: 'Advisor has not solved the complaint within the deadline',
            });

        } else if (complaint.currentLevel === 'hod') {
            // HOD timeouts then reassign to Dean
            const deanId = complaint.assignedBy || (await User.findOne({ role: 'dean' }))?._id;

            complaint.currentLevel = 'dean';
            complaint.currentAssignee = deanId;
            complaint.levelDeadline = addTime(DURATIONS.DEAN);
            complaint.status = 'escalated';
            await complaint.save();

            await ComplaintLog.create({
                complaint: complaint._id,
                level: 'dean',
                action: 'escalated',
                remarks: 'HOD has not solved the complaint within the deadline',
            });

        } else if (complaint.currentLevel === 'dean') {
            // Dean timeouts then escalate to VC (super_admin)
            const vc = await User.findOne({ role: 'super_admin' });

            complaint.currentLevel = 'vc';
            complaint.currentAssignee = vc?._id || null;
            complaint.status = 'escalated';
            await complaint.save();

            await ComplaintLog.create({
                complaint: complaint._id,
                level: 'vc',
                action: 'escalated',
                remarks: 'Dean has not solved the complaint within the deadline — escalated to VC',
            });
        }
    }

    console.log(`Checked timeouts: ${expiredComplaints.length} complaints processed`);
};

// 7. Escalate (Advisor -> HOD, HOD -> Dean)
const escalateComplaint = async (req, res) => {
    try {
        const { complaintId, remarks } = req.body;
        const { role } = req.user;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        let nextLevel;
        if (role === 'advisor') nextLevel = 'hod';
        else if (role === 'hod') nextLevel = 'dean';
        else {
            return res.status(403).json({ success: false, message: 'Not authorized to escalate' });
        }

        complaint.currentLevel = nextLevel;
        complaint.currentAssignee = null; // Reassign to Dean/HOD 
        complaint.status = 'escalated';
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: nextLevel,
            action: 'escalated',
            remarks,
        });

        res.json({ success: true, message: `Complaint escalated to ${nextLevel}`, complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 8. Resolve complaint
const resolveComplaint = async (req, res) => {
    try {
        const { complaintId, remarks } = req.body;

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ success: false, message: 'Complaint not found' });
        }

        complaint.status = 'resolved';
        complaint.resolvedAt = new Date();
        await complaint.save();

        await ComplaintLog.create({
            complaint: complaint._id,
            level: complaint.currentLevel,
            action: 'resolved',
            remarks,
        });

        res.json({ success: true, message: 'Complaint resolved', complaint });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export {
    createComplaint,
    getComplaints,
    getComplaintById,
    assignComplaint,
    updateComplaintStatus,
    escalateComplaint,
    resolveComplaint,
    handleTimeouts
};