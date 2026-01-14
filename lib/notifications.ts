export const showSuccess = (message: string) => {
    alert(message);
};

export const showError = (error: any) => {
    const errorMessage = error?.message || error?.toString() || "An error occurred";
    alert(`Ralat: ${errorMessage}`);
};

export const confirmAction = (message: string): boolean => {
    return confirm(message);
};
