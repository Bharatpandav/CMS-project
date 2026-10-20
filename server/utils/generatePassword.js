import crypto from 'crypto';

const generatePassword = (length = 12) => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$%&*!';

    const allChars = uppercase + lowercase + numbers + symbols;

    // Cryptographically secure character selector
    const getRandomChar = (charset) => {
        const randomIndex = crypto.randomInt(0, charset.length);
        return charset[randomIndex];
    };

    // Ensure at least one character from each class is included
    const passwordChars = [
        getRandomChar(uppercase),
        getRandomChar(lowercase),
        getRandomChar(numbers),
        getRandomChar(symbols)
    ];

    // Fill the remaining length
    for (let i = passwordChars.length; i < length; i++) {
        passwordChars.push(getRandomChar(allChars));
    }

    // Cryptographically secure Fisher-Yates shuffle
    for (let i = passwordChars.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [passwordChars[i], passwordChars[j]] = [passwordChars[j], passwordChars[i]];
    }

    return passwordChars.join('');
};

export default generatePassword;