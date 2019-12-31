const Review = require('./review').Review; 

const addNewReview = (reviewInfo) => {
    return new Promise(async (resolve, reject) => {
        // required properties of Review object 
        const requiredProperties = ['reviewerUsername', 'revieweeUsername', 'rating', 'rideId']
        try {
            // simple field validation 
            if (requiredProperties.every(property => reviewInfo.hasOwnProperty(property))) {
                const review = new Review(reviewInfo) 
                await review.save()
                resolve(review)
            }
            reject('Review must contain a reviewer username, reviewee username, rating, and associated ride ID') 
        }
        catch(e) {
            reject('Could not add a new review to the database.') 
        }
    })
}

const hasBeenReviewed = (reviewer, reviewee, rideId) => {
    return new Promise(async (resolve, reject) => {
        const review = await Review.findOne({
            reviewerUsername : reviewer,
            revieweeUsername : reviewee, 
            rideId
        })

        if (!review) {
            resolve(false) 
        }
        resolve(true) 
    })
}

module.exports = {
    addNewReview, 
    hasBeenReviewed
}; 