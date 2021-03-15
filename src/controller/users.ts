import { Request, Response } from "express"
import { User } from "../models/User"
import { Tag } from "../models/Tag"
import { UserTag } from "../models/UserTag"
import bcrypt from "bcrypt";
import Sequelize from "sequelize";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
import axios from "axios";
import AWS from 'aws-sdk';
import fs from 'fs';
import { Op } from "sequelize";

export const controller = {
  get: async (req: Request, res: Response) => {
    try {
      if(req.query.page) {
        let pageNum: any = req.query.page;
        let offset: number = 0;
        if(pageNum > 1) {
          offset = 36 * (pageNum - 1);
        }
        const data = await User.findAll({
          attributes: { exclude: ["password"] },
          include: [{
            model: Tag,
            attributes: ["tagName"],
            through: { attributes: [] }
          }],
          offset,
          limit: 36
        })
        res.status(200).json({ data: data, message: "ok" });
      } else if(req.query.user_id) {
        const data = await User.findOne({
          attributes: { exclude: ["password"] },
          include: [{
            model: Tag,
            through: { attributes: [] }
          }],
          where: { id: req.query.user_id }
        })
        res.status(200).json({ data: data, message: "ok" });
        }
      } catch (err) {
      console.log(err.message);
      }
  },
  getMyInfo: async (req: Request, res: Response) => {
    try {
      const authorization:any = req.headers['authorization'];
      const token = authorization.split(' ')[1];
        jwt.verify(token, process.env.ACCESS_SECRET!, async (error: any, result: any) => {
          const data = await User.findOne({ 
            attributes: { exclude: ["password"] },
            include: [{
              model: Tag,
              through: { attributes: [] }
            }],
            where: { id: result.id }
          })
          res.status(200).json({ data: data, message: "ok" });          
        });
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
    } catch (err) {
      console.log(err.message);
    }
  },  
  getCount: async (req: Request, res: Response) => {
    try {
      const data = await User.findAll({
        attributes: [[Sequelize.fn("COUNT", Sequelize.col("id")), "count"]]
      })
      res.status(200).json({ data: data, message: "ok" });   
    } catch (err) {
      console.log(err.message);
    }
  },
  signUp: async (req: Request, res: Response) => {
    try {
      const { email, password, nickname, location, aboutMe, tags } = req.body;
      const sameEmail = await User.findOne({ where: { email } });
      const sameNickname = await User.findOne({ where: { nickname } });

      if (sameEmail) {
        res.status(400).json({ data: null, message: "Such email already exists" });
      } else if (sameNickname) {
        res.status(400).json({ data: null, message: "Such nickname already exists" });
      } else {
        const salt = await bcrypt.genSalt();
        const $password = await bcrypt.hash(password, salt);
        if (!email || !password || !nickname) {
          res.status(400).json({ data: null, message: "should send full data" });
        } else {
          if(req.file !== undefined) {
            const s3 = new AWS.S3({
              accessKeyId: process.env.AWS_ACCESS_KEY,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });
            const param = {
              Bucket: "whynotworking",
              Key:
                "image/" + nickname + "profile" + new Date().getTime() + ".jpg",
              ACL: "public-read",
              Body: req.file.buffer
            };
            s3.upload(param, async function (err:any, data:any) {
              const userData = await User.create({ email, password: $password, nickname, location, aboutMe, image: data.Location });
              if(tags) {
                for(let i = 0; i < tags.length; i++) {
                  const [result, created] = await Tag.findOrCreate({
                    where: { tagName: tags[i] },
                    defaults: { tagName: tags[i] }
                  });
                  await UserTag.findOrCreate({
                    where: { userId: userData.id, tagId: result.id },
                    defaults: { userId: userData.id, tagId: result.id }
                  });
                }
              }
              res.status(200).json({ data: null, message: "ok" });
            });
          } else {
            const userData = await User.create({ email, password: $password, nickname, image: "https://i.imgur.com/lqGXdm7.png", location, aboutMe });
            if(tags) {
              for(let i = 0; i < tags.length; i++) {
                const [result, created] = await Tag.findOrCreate({
                  where: { tagName: tags[i] },
                  defaults: { tagName: tags[i] }
                });
                await UserTag.findOrCreate({
                  where: { userId: userData.id, tagId: result.id },
                  defaults: { userId: userData.id, tagId: result.id }
                });
              }
            }
            res.status(200).json({ data: null, message: "ok" });
          }
        }
      }
    } catch (err) {
      console.log(err.message);
    }
  },
  patch: async (req: Request, res: Response) => {
    try {
      const token = req.cookies.accessToken;
      jwt.verify(token, process.env.ACCESS_SECRET!, async (error: any, result: any) => {
        let { nickname, password, image, aboutMe, location, tags } = req.body;
        if(password) {
            const salt = await bcrypt.genSalt();
            password = await bcrypt.hash(password, salt);
        } 
        if(nickname) {
          const sameNickname = await User.findOne({ where: { nickname, id: { [Op.ne]: result.id } } });
          if(sameNickname) {
            res.status(400).json({ data: null, message: "Such nickname already exists" });
          } else {
            if(req.file !== undefined) {
              const s3 = new AWS.S3({
                accessKeyId: process.env.AWS_ACCESS_KEY,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
              });
              const param = {
                Bucket: "whynotworking",
                Key:
                  "image/" + result.nickname + "profile" + new Date().getTime() + ".jpg",
                ACL: "public-read",
                Body: req.file.buffer
              };
              s3.upload(param, async function (err:any, data:any) {
                await User.update(
                  { nickname, password, image: data.Location, aboutMe, location },
                  { where: { id: result.id } }
                );
                if(tags) {
                  for(let i = 0; i < tags.length; i++) {
                    const [result2, created] = await Tag.findOrCreate({
                      where: { tagName: tags[i] },
                      defaults: { tagName: tags[i] }
                    });
                    await UserTag.findOrCreate({
                      where: { userId: result.id, tagId: result2.id },
                      defaults: { userId: result.id, tagId: result2.id }
                    });
                  }
                }
                const userData = await User.findOne({ 
                  attributes: { exclude: ["password"] },
                  where: { id: result.id } 
                });
                res.status(200).json({ data: userData, message: "ok" });
              });
            } else {
              await User.update(
                { nickname, password, aboutMe, location },
                { where: { id: result.id } }
              );
              const userData = await User.findOne({ 
                attributes: { exclude: ["password"] },
                where: { id: result.id } 
              });
              res.status(200).json({ data: userData, message: "ok" });
            }
          }
        } else {
          if(req.file !== undefined) {
            const s3 = new AWS.S3({
              accessKeyId: process.env.AWS_ACCESS_KEY,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
            });
            const param = {
              Bucket: "whynotworking",
              Key:
                "image/" + result.nickname + "profile" + new Date().getTime() + ".jpg",
              ACL: "public-read",
              Body: req.file.buffer
            };
            s3.upload(param, async function (err:any, data:any) {
              await User.update(
                { password, image: data.Location, aboutMe, location },
                { where: { id: result.id } }
              );
              if(tags) {
                for(let i = 0; i < tags.length; i++) {
                  const [result2, created] = await Tag.findOrCreate({
                    where: { tagName: tags[i] },
                    defaults: { tagName: tags[i] }
                  });
                  await UserTag.findOrCreate({
                    where: { userId: result.id, tagId: result2.id },
                    defaults: { userId: result.id, tagId: result2.id }
                  });
                }
              }
              const userData = await User.findOne({ 
                attributes: { exclude: ["password"] },
                where: { id: result.id } 
              });
              res.status(200).json({ data: userData, message: "ok" });
            });
          } else {
            await User.update(
              { password, aboutMe, location },
              { where: { id: result.id } }
            );
            const userData = await User.findOne({ 
              attributes: { exclude: ["password"] },
              where: { id: result.id } 
            });
            res.status(200).json({ data: userData, message: "ok" });
          }
        } 
      })
  } catch(err) {
    console.log(err.message);
  }
  }
}