require("../../src/db/mongoose");

const db = require("../../src/noti/controller.js")
const Noti = require("../../src/noti/noti").Noti;
const User = require("../../src/user/user").User;

describe("Testing noti model controllers", () => {
    const curr_date = new Date();
    const paster_date = new Date().setDate(curr_date.getDate()-50);
    const pastest_date = new Date().setDate(curr_date.getDate()-100);

    const userObj_1 = 
        {
            isRegistered: true, 
            password: "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8",
            username: "user1",
            firstName: "user1",
            email: "user1-noreply@g.ucla.edu",
            picUrl: "https://bruinpool-bucket-alpha.s3.us-east-2.amazonaws.com/defaultProfilePic/BruinPoolLogo_white.png",
        }
    const notiObj_1 = {
        username: userObj_1.username,
        msg: "notification #1",
        date: curr_date,
    };
    const notiObj_2 = {
        username: userObj_1.username,
        msg: "notification #2",
        date: paster_date,
    };
    const notiObj_3 = {
        username: userObj_1.username,
        msg: "notification #3",
        date: pastest_date,
    };
    beforeEach( async() => {
        await User.create(userObj_1);
    })
    afterEach( async() => {
        await User.deleteMany();
        await Noti.deleteMany();
    })

    test("Testing viewing notifications", async () => {
        const notiObj_arr = [notiObj_3, notiObj_1, notiObj_2];
        const res_notiNewArr = await Noti.create(notiObj_arr)
        const res_notiSorted = await db.getUnviewedNoti(userObj_1.username);
        res_notiNewArr.sort((a,b) => { return  ((a.date < b.date) ? 1 : -1)})

        expect(res_notiNewArr.map(n => n.date)).toEqual(res_notiSorted.map(n => n.date));

        await db.updateNoti(res_notiNewArr[0]);
        const res_unviewedNoti = await db.getUnviewedNoti(userObj_1.username);
        expect(res_unviewedNoti.length).toBe(2)
    })
})