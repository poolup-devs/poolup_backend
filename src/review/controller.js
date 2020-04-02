const User = require('../user/user').User; 
const Review = require('./review').Review; 
const Ride = require('../ride/ride').Ride; 
const scheduler = require('../tasks/scheduler')


// Create a new review with required properties: reviewer username, reviewee username, rating, and ride ID 
const addNewReview = (reviewInfo) => {
    return new Promise(async (resolve, reject) => {
        // Required properties of Review object 
        const requiredProperties = ['reviewerUsername', 'revieweeUsername', 'rating', 'rideId']
        try {
            // Simple field validation 
            if (requiredProperties.every(property => reviewInfo.hasOwnProperty(property))) {
                const {reviewerUsername, revieweeUsername, rideId} = reviewInfo
                
                // Prevent duplicate insertion if document already exists 
                if (!(await Review.findOne({reviewerUsername, revieweeUsername, rideId}))) {
                    const counterpartReview = await Review.findOne({reviewerUsername: revieweeUsername, revieweeUsername: reviewerUsername, rideId})

                    // Counterpart has already left their review 
                    if (counterpartReview) {
                        // Publish both reviews 
                        counterpartReview.isPublished = true 
                        await counterpartReview.save() 
                        reviewInfo.isPublished = true 
                        var newReview = await Review.create(reviewInfo)

                        // Update both ratings 
                        await User.findOneAndUpdate({username: counterpartReview.revieweeUsername}, {$inc: {"rating.sumOfAllRatings": counterpartReview.rating, "rating.totalRatings": 1}}) 
                        await User.findOneAndUpdate({username: newReview.revieweeUsername}, {$inc: {"rating.sumOfAllRatings": newReview.rating, "rating.totalRatings": 1}}) 

                        // Cancel the scheduled tasks that expire the ability to review
                        scheduler.cancelTask(`expireAbilityToLeaveReviewTask.${reviewInfo.rideId}.${reviewerUsername}.${revieweeUsername}`)
                        scheduler.cancelTask(`expireAbilityToLeaveReviewTask.${reviewInfo.rideId}.${revieweeUsername}.${reviewerUsername}`)
                    }
                    else {
                        // Counterpart has not left their review, so create new review but leave it as unpublished 
                        var newReview = await Review.create(reviewInfo)
                    }
                    resolve(newReview)
                }
                else {
                    reject('A review has already been made to ' + reviewInfo.revieweeUsername + ' for this ride.')
                }
            }
            reject('Review must contain a reviewer username, reviewee username, rating, and associated ride ID') 
        }
        catch(e) {
            reject(e) 
        }
    })
}

// Decline to review a user on a particular ride 
const declineReview = (reviewer, reviewee, rideId) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (!(await Review.findOne({reviewerUsername: reviewer, revieweeUsername:reviewee, rideId}))) {
                const declinedReview = await new Review({
                    revieweeUsername: reviewee, 
                    reviewerUsername: reviewer, 
                    rideId, 
                    isDeclined: true 
                }).save()
                resolve(declinedReview) 
            }
            reject('User has already declined to review ' + reviewee + ' for ride: ' + rideId)
        }
        catch(e) {
            reject('Could not add the declined review to the database.') 
        }
    })
}


// Get all the reviews received by a user 
const getUserReviews = (username, pageNumber) => {
    return new Promise(async (resolve, reject) => {
        await Review.find({revieweeUsername : username, isDeclined: false}, (err, reviews) => { 
          // if there are no reviews, return []
          resolve(Array.from(reviews)) 
        })
        .sort({datePosted: -1})
        .skip(pageNumber * 5)
        .limit(5); 
    })
}


module.exports = {
    addNewReview, 
    declineReview, 
    getUserReviews
}; 