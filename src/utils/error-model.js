const commonStatuses = {
    404: "Resource not found",
    500: "Internal server error"
}

const createErr = (status, message) => {
    if (message) {
        return {
            status,
            message
        }
    } else {
        return {
            status,
            message: commonStatuses[status]
        }
    }
    
}

module.exports= createErr