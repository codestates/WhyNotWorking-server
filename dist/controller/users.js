"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.controller = void 0;
const User_1 = require("../models/User");
const Tag_1 = require("../models/Tag");
const UserTag_1 = require("../models/UserTag");
const bcrypt_1 = __importDefault(require("bcrypt"));
const sequelize_1 = __importDefault(require("sequelize"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const google_auth_library_1 = require("google-auth-library");
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const sequelize_2 = require("sequelize");
exports.controller = {
    get: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (req.query.page) {
                let pageNum = req.query.page;
                let offset = 0;
                if (pageNum > 1) {
                    offset = 36 * (pageNum - 1);
                }
                const data = yield User_1.User.findAll({
                    attributes: { exclude: ["password"] },
                    include: [{
                            model: Tag_1.Tag,
                            attributes: ["tagName"],
                            through: { attributes: [] }
                        }],
                    offset,
                    limit: 36
                });
                res.status(200).json({ data: data, message: "ok" });
            }
            else if (req.query.user_id) {
                const data = yield User_1.User.findOne({
                    attributes: { exclude: ["password"] },
                    include: [{
                            model: Tag_1.Tag,
                            through: { attributes: [] }
                        }],
                    where: { id: req.query.user_id }
                });
                res.status(200).json({ data: data, message: "ok" });
            }
        }
        catch (err) {
            console.log(err.message);
        }
    }),
    getMyInfo: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const authorization = req.headers['authorization'];
            const token = authorization.split(' ')[1];
            jsonwebtoken_1.default.verify(token, process.env.ACCESS_SECRET, (error, result) => __awaiter(void 0, void 0, void 0, function* () {
                const data = yield User_1.User.findOne({
                    attributes: { exclude: ["password"] },
                    include: [{
                            model: Tag_1.Tag,
                            through: { attributes: [] }
                        }],
                    where: { id: result.id }
                });
                res.status(200).json({ data: data, message: "ok" });
            }));
            // else if(req.cookies.facebookOauthToken) {
            //   console.log(req.cookies.facebookOauthToken);
            //   const token: any = req.cookies.facebookOauthToken;
            //   const profile = await axios({
            //     url: `https://graph.facebook.com/me?fields=email,first_name,last_name&access_token=${token}`,
            //     method: "get"
            //   })
            //   const picture = await axios({
            //     url: `https://graph.facebook.com/me/picture?fields=url&type=large&redirect=0&access_token=${token}`,
            //     method: "get"
            //   })
            //   res.status(200).send({ data: profile.data, picture: picture.data })
            // }
        }
        catch (err) {
            console.log(err.message);
        }
    }),
    getCount: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const data = yield User_1.User.findAll({
                attributes: [[sequelize_1.default.fn("COUNT", sequelize_1.default.col("id")), "count"]]
            });
            res.status(200).json({ data: data, message: "ok" });
        }
        catch (err) {
            console.log(err.message);
        }
    }),
    signUp: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { email, password, nickname, location, aboutMe, tags } = req.body;
            const sameEmail = yield User_1.User.findOne({ where: { email } });
            const sameNickname = yield User_1.User.findOne({ where: { nickname } });
            if (sameEmail) {
                res.status(400).json({ data: null, message: "Such email already exists" });
            }
            else if (sameNickname) {
                res.status(400).json({ data: null, message: "Such nickname already exists" });
            }
            else {
                const salt = yield bcrypt_1.default.genSalt();
                const $password = yield bcrypt_1.default.hash(password, salt);
                if (!email || !password || !nickname) {
                    res.status(400).json({ data: null, message: "should send full data" });
                }
                else {
                    if (req.file !== undefined) {
                        const s3 = new aws_sdk_1.default.S3({
                            accessKeyId: process.env.AWS_ACCESS_KEY,
                            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                        });
                        const param = {
                            Bucket: "whynotworking",
                            Key: "image/" + nickname + "profile" + new Date().getTime() + ".jpg",
                            ACL: "public-read",
                            Body: req.file.buffer
                        };
                        s3.upload(param, function (err, data) {
                            return __awaiter(this, void 0, void 0, function* () {
                                const userData = yield User_1.User.create({ email, password: $password, nickname, location, aboutMe, image: data.Location });
                                if (tags) {
                                    for (let i = 0; i < tags.length; i++) {
                                        const [result, created] = yield Tag_1.Tag.findOrCreate({
                                            where: { tagName: tags[i] },
                                            defaults: { tagName: tags[i] }
                                        });
                                        yield UserTag_1.UserTag.findOrCreate({
                                            where: { userId: userData.id, tagId: result.id },
                                            defaults: { userId: userData.id, tagId: result.id }
                                        });
                                    }
                                }
                                res.status(200).json({ data: null, message: "ok" });
                            });
                        });
                    }
                    else {
                        const userData = yield User_1.User.create({ email, password: $password, nickname, image: "https://i.imgur.com/lqGXdm7.png", location, aboutMe });
                        if (tags) {
                            for (let i = 0; i < tags.length; i++) {
                                const [result, created] = yield Tag_1.Tag.findOrCreate({
                                    where: { tagName: tags[i] },
                                    defaults: { tagName: tags[i] }
                                });
                                yield UserTag_1.UserTag.findOrCreate({
                                    where: { userId: userData.id, tagId: result.id },
                                    defaults: { userId: userData.id, tagId: result.id }
                                });
                            }
                        }
                        res.status(200).json({ data: null, message: "ok" });
                    }
                }
            }
        }
        catch (err) {
            console.log(err.message);
        }
    }),
    patch: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const token = req.cookies.accessToken;
            jsonwebtoken_1.default.verify(token, process.env.ACCESS_SECRET, (error, result) => __awaiter(void 0, void 0, void 0, function* () {
                let { nickname, password, image, aboutMe, location, tags } = req.body;
                if (password) {
                    const salt = yield bcrypt_1.default.genSalt();
                    password = yield bcrypt_1.default.hash(password, salt);
                }
                if (nickname) {
                    const sameNickname = yield User_1.User.findOne({ where: { nickname, id: { [sequelize_2.Op.ne]: result.id } } });
                    if (sameNickname) {
                        res.status(400).json({ data: null, message: "Such nickname already exists" });
                    }
                    else {
                        if (req.file !== undefined) {
                            const s3 = new aws_sdk_1.default.S3({
                                accessKeyId: process.env.AWS_ACCESS_KEY,
                                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                            });
                            const param = {
                                Bucket: "whynotworking",
                                Key: "image/" + result.nickname + "profile" + new Date().getTime() + ".jpg",
                                ACL: "public-read",
                                Body: req.file.buffer
                            };
                            s3.upload(param, function (err, data) {
                                return __awaiter(this, void 0, void 0, function* () {
                                    yield User_1.User.update({ nickname, password, image: data.Location, aboutMe, location }, { where: { id: result.id } });
                                    if (tags) {
                                        for (let i = 0; i < tags.length; i++) {
                                            const [result2, created] = yield Tag_1.Tag.findOrCreate({
                                                where: { tagName: tags[i] },
                                                defaults: { tagName: tags[i] }
                                            });
                                            yield UserTag_1.UserTag.findOrCreate({
                                                where: { userId: result.id, tagId: result2.id },
                                                defaults: { userId: result.id, tagId: result2.id }
                                            });
                                        }
                                    }
                                    const userData = yield User_1.User.findOne({
                                        attributes: { exclude: ["password"] },
                                        where: { id: result.id }
                                    });
                                    res.status(200).json({ data: userData, message: "ok" });
                                });
                            });
                        }
                        else {
                            yield User_1.User.update({ nickname, password, aboutMe, location }, { where: { id: result.id } });
                            const userData = yield User_1.User.findOne({
                                attributes: { exclude: ["password"] },
                                where: { id: result.id }
                            });
                            res.status(200).json({ data: userData, message: "ok" });
                        }
                    }
                }
                else {
                    if (req.file !== undefined) {
                        const s3 = new aws_sdk_1.default.S3({
                            accessKeyId: process.env.AWS_ACCESS_KEY,
                            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
                        });
                        const param = {
                            Bucket: "whynotworking",
                            Key: "image/" + result.nickname + "profile" + new Date().getTime() + ".jpg",
                            ACL: "public-read",
                            Body: req.file.buffer
                        };
                        s3.upload(param, function (err, data) {
                            return __awaiter(this, void 0, void 0, function* () {
                                yield User_1.User.update({ password, image: data.Location, aboutMe, location }, { where: { id: result.id } });
                                if (tags) {
                                    for (let i = 0; i < tags.length; i++) {
                                        const [result2, created] = yield Tag_1.Tag.findOrCreate({
                                            where: { tagName: tags[i] },
                                            defaults: { tagName: tags[i] }
                                        });
                                        yield UserTag_1.UserTag.findOrCreate({
                                            where: { userId: result.id, tagId: result2.id },
                                            defaults: { userId: result.id, tagId: result2.id }
                                        });
                                    }
                                }
                                const userData = yield User_1.User.findOne({
                                    attributes: { exclude: ["password"] },
                                    where: { id: result.id }
                                });
                                res.status(200).json({ data: userData, message: "ok" });
                            });
                        });
                    }
                    else {
                        yield User_1.User.update({ password, aboutMe, location }, { where: { id: result.id } });
                        const userData = yield User_1.User.findOne({
                            attributes: { exclude: ["password"] },
                            where: { id: result.id }
                        });
                        res.status(200).json({ data: userData, message: "ok" });
                    }
                }
            }));
        }
        catch (err) {
            console.log(err.message);
        }
    })
};
//# sourceMappingURL=users.js.map