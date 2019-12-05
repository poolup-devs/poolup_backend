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

module.exports = {
    getAverageRating
}; 