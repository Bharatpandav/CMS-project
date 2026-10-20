export function previewResponsibleDepartment(category, student) {
    if (!category?.targetDepartment) {
        return '';
    }

    if (
        category.targetDepartment === 'Academic Affairs' &&
        student?.department
    ) {
        return student.department;
    }

    return category.targetDepartment;
}
