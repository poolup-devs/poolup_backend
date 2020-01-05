const Review = require('./review').Review; 
const mongoose = require('mongoose')

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

const getReview = (reviewer, reviewee, rideId) => {
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
            resolve(review) 
        }
        catch(e) {
            console.log(e)
        }
    })
}

module.exports = {
    addNewReview, 
    getReview
}; 