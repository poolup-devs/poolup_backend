const mongoose = require('mongoose'); 
const reviewSchema = new mongoose.Schema({
    rideId: {
        type: mongoose.Types.ObjectId, 
        index: true 
    },
    reviewerUsername: {
        type: String, 
        index: true
    },
    revieweeUsername: {
        type: String, 
        index: true 
    }, 
    isDeclined: {
        type: Boolean,
        default: false 
    }, 
    rating: {
        type: Number 
    }, 
    comment: String, 
    datePosted: {
        type: Date, 
        default: Date.now 
    }, 
}); 

const Review = mongoose.model("Review", reviewSchema); 
module.exports = {Review}; 