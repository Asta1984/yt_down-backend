export function validateUrl(url) {

    if (!url) {
        throw {
            status: 400,
            message: "URL is required"
        };
    }

    let parsed;

    try {
        parsed = new URL(url);
    } catch {
        throw {
            status: 400,
            message: "Invalid URL"
        };
    }

    if (
        parsed.protocol !== "http:" &&
        parsed.protocol !== "https:"
    ) {
        throw {
            status: 400,
            message: "Only HTTP/HTTPS URLs are allowed"
        };
    }

}