const Review = require('./review').Review; 
const MIN_TO_DISPLAY_AVERAGE_RATING = 3 

const getAverageRating = (username) => {
    return new Promise(async (resolve, reject) => {
        let totalRating = 0; 
        try {
            await Review.find({revieweeUsername : username}).then((reviews) => {  
                if (reviews.length >= MIN_TO_DISPLAY_AVERAGE_RATING) {
                    reviews.forEach((review) => {
                        totalRating = totalRating + review.rating; 
                    }) 
                    const averageRating = (totalRating / reviews.length).toFixed(2)
                    return resolve(averageRating)
                }
                else {
                    return reject("User must have at least " + MIN_TO_DISPLAY_AVERAGE_RATING + " ratings to display an average rating!"); 
                }   
            })
        }
        catch(err) {
            return reject("Could not retrieve all reviews left for user.")
        }
    })
}; 

const getUserReviews = (username) => {
    return new Promise(async (resolve, reject) => {
        await Review.find({revieweeUsername : username}).then((reviews) => { 
            if (reviews.length > 0) {
                resolve(reviews)
            }
            else {
                reject("Username '" + username + "' has not received any reviews")
            }
        })
    })
}

const addNewReview = (reviewInfo) => {
    return new Promise(async (resolve, reject) => {
        // required properties of Review object 
        const requiredProperties = ['reviewerUsername', 'revieweeUsername', 'rating', 'rideId']
        try {
            // simple field validation 
            if (requiredProperties.every(property => reviewInfo.hasOwnProperty(property))) {
                await Review.create(reviewInfo)
                resolve('Success')
            }
            reject('Review must contain a reviewer username, reviewee username, rating, and associated ride ID') 
        }
        catch(e) {
            reject('Could not add a new review to the database.') 
        }
        
    })
}

module.exports = {
    getAverageRating, 
    getUserReviews, 
    addNewReview
}; 