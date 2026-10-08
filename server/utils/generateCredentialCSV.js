import { Parser } from 'json2csv';

const generateCredentialCSV = (users) => {
    const fields = [
        'name',
        'email',
        'role',
        'temporaryPassword'
    ];

    const parser = new Parser({
        fields
    });

    return parser.parse(users);
};

export default generateCredentialCSV;