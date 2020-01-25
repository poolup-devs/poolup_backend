const IntentBeta = require("./IntentBeta.js").IntentBeta;

const createIntentBeta = (targetDate, rideID, ownerUsername, customerUsername) => {
    return new Promise( async(resolve, reject) => {
        try {
            const newIntentBeta = await new IntentBeta({
                targetDate, 
                rideID, 
                ownerUsername, 
                customerUsername,
                date: new Date()
            }).save();
            resolve(newIntentBeta);
        } catch(e) {
            reject();
        }
    })
}

const checkExpired = () => {
    return new Promise( async(resolve, reject) => {
        try {
            await IntentBeta.find({targetDate: {$lt: new Date()}, expired: false}).then((IntentBetas) => {
                if(IntentBetas.length===0) {
                    resolve(IntentBetas);
                }
                const res = IntentBetas;
                res.forEach(intent => {
                    intent.expired=true;
                    intent.save();
                });
                resolve(res);
            })
        } catch(e){
            reject();
        }
    });
}

module.exports = { 
    checkExpired,
    createIntentBeta 
};