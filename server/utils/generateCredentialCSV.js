import { Parser } from 'json2csv';

const generateCredentialCSV = (users) => {
    const fields = [
        'name',
        'loginIdentifier',
        'email',
        'role',
        'temporaryPassword'
    ];

    const formattedUsers = users.map((user) => ({
        name: user.name,
        loginIdentifier:
            user.loginIdentifier ||
            (user.role === 'student' ? user.rollNumber : user.email),
        email: user.email,
        role: user.role,
        temporaryPassword: user.temporaryPassword
    }));

    const parser = new Parser({
        fields
    });

    return parser.parse(formattedUsers);
};

export default generateCredentialCSV;