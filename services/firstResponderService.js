export const requestFirstResponder = async (name, location) => {
    try {
        const response = await fetch('/api/request-responder', {
            method: 'POST',
            body: JSON.stringify({ name, location }),
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error requesting first responder:', error);
    }
};
