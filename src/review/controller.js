const Review = require('./review').Review; 
const Ride = require('../ride/ride').Ride; 

// Users require a certain minimum amount of ratings to calculate an average rating 
const MIN_TO_DISPLAY_AVERAGE_RATING = 1

// Create a new review with required properties: reviewer username, reviewee username, rating, and ride ID 
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

// Get the average rating of a user, aggregated from all reviews received by the user 
const getAverageRating = (username) => {
    return new Promise(async (resolve, reject) => {
        let totalRating = 0; 
        try {
            await Review.find({revieweeUsername : username}).then((reviews) => {  
                if (reviews.length >= 1 && reviews.length >= MIN_TO_DISPLAY_AVERAGE_RATING) {
                    reviews.forEach((review) => {
                      totalRating = totalRating + review.rating; 
                    }) 
                    const averageRating = (totalRating / reviews.length).toFixed(2)
                    return resolve(averageRating)
                }
                else {
                    return reject("User must have at least " + MIN_TO_DISPLAY_AVERAGE_RATING + " rating(s) to display an average rating!"); 
                }   
            })
        }
        catch(err) {
            return reject("Could not retrieve all reviews left for user.")
        }
    })
}; 

// Get all the reviews received by a user 
const getUserReviews = (username, pageNumber) => {
    return new Promise(async (resolve, reject) => {
        await Review.find({revieweeUsername : username}, (err, reviews) => { 
          // if there are no reviews, return []
          resolve(Array.from(reviews)) 
        })
        .sort({date: 1})
        .skip(pageNumber * 5)
        .limit(5); 
    })
}

// Helper method to determine whether a review exists; used to determine whether a review needs to be made 
const isExistingReview = async (reviewer, reviewee, rideId) => {
    return new Promise(async (resolve, reject) => {
        try {
            const review = await Review.findOne({
                reviewerUsername : reviewer,
                revieweeUsername : reviewee, 
                rideId : rideId
            })

            if (!review) {
                resolve(false)
            }
            resolve(true)
        }
        catch(e) {
            console.log(e)
        }
    })
}

const getUsersToReviewFromLatestRide = (username) => {
    return new Promise(async (resolve, reject) => {
        try {
            // Obtain latest ride details 
            Ride.findOne({$or: [{passengers: username}, {ownerUsername: username}], date: { $lt: new Date() } }, async (err, latestRide) => {
                if (!latestRide) {
                    return resolve({usernamesToReview: []})
                }
                const {passengers} = latestRide
                const rideId = latestRide._id
                const driverUsername = latestRide.ownerUsername
                // User was the driver for the ride 
                if (driverUsername === username) {
                    usernamesToReview = [] 
                    for (var i = 0; i < passengers.length; i++) {
                        //  Driver has not rated the passenger yet 
                        if (!(await isExistingReview(username, passengers[i], rideId))) {
                            usernamesToReview.push(passengers[i])
                        }
                    }
                    resolve({usernamesToReview, rideId})
                }
                else {
                    // User was a passenger for this ride and has not reviewed the driver yet 
                    if (!(await isExistingReview(username, driverUsername, rideId))) {
                        resolve({usernamesToReview: [driverUsername], rideId})
                    }
                    else {
                        resolve({usernamesToReview: [], rideId})
                    }
                }
            }).sort({date: -1}).limit(1); 
        }
        catch(e) {
            console.log(e) 
        }
    })
}

module.exports = {
    addNewReview, 
    isExistingReview, 
    getAverageRating, 
    getUserReviews, 
    getUsersToReviewFromLatestRide
}; 