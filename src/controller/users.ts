import { Request, Response } from "express"
import { User } from "../models/User"
import bcrypt from "bcrypt";
import Sequelize from "sequelize";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
          attributes: ["id", "nickname", "email", "image", "location"],
          offset,
          limit: 36
        })
        res.status(200).json({ data: data, message: "ok" });
      } else if(req.query.user_id) {
        const data = await User.findOne({
          attributes: ["id", "nickname", "email", "image", "aboutMe", "location"],
          where: { id: req.query.user_id }
        })
        res.status(200).json({ data: data, message: "ok" });
      } else {
        if(req.cookies.accessToken) {
          const token: any = req.cookies.accessToken;
          jwt.verify(token, process.env.ACCESS_SECRET!, async (error: any, result: any) => {
            const data = await User.findOne({ 
              attributes: ["id", "nickname", "email", "image", "aboutMe", "location"],
              where: { id: result.userInfo.id }
            })
            res.status(200).json({ data: data, message: "ok" });          
          })
        } else if(req.cookies.googleOauthToken) {
          const token: any = req.cookies.googleOauthToken;
          const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
          });
          const payload: any = ticket.getPayload();
          const myInfo = await User.findOne({
            where: { nickname: payload.name },
            attributes: { exclude: ["password"] }
          });
          if(myInfo) {
            res.status(200).json({ data: myInfo, message: "ok" });
          }
        }
        }
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
      const { email, password, nickname, location, aboutMe } = req.body;
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
          await User.create({ email, password: $password, nickname, location, aboutMe  });
          res.status(200).json({ data: null, message: "ok" });
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
        const { nickname, password, image, aboutMe, location } = req.body;
        // password가 있는 경우
          if(password) {
            const salt = await bcrypt.genSalt();
            const $password = await bcrypt.hash(password, salt);
            // nickname이 들어오면 중복 검증
            if(nickname) {
              const sameNickname = await User.findOne({ where: { nickname } });
              if (sameNickname) {
                res.status(400).json({ data: null, message: "Such nickname already exists" });
              } else {
                await User.update(
                  { nickname, password: $password, image, aboutMe, location },
                  { where: { id: result.userInfo.id } }
                );
                res.status(200).json({ data: null, message: "ok" });
              }
            }
            // nickname이 안들어올 경우
            await User.update(
              { password: $password, image, aboutMe, location },
              { where: { id: result.userInfo.id } }
            );
            res.status(200).json({ data: null, message: "ok" });
        } 
        // password가 없는 경우
        else {
          // nickname이 들어오면 중복 검증
          if(nickname) {
            const sameNickname = await User.findOne({ where: { nickname } });
            if (sameNickname) {
              res.status(400).json({ data: null, message: "Such nickname already exists" });
            } else {
              // nickname이 안들어올 경우
              await User.update(
                { nickname, image, aboutMe, location },
                { where: { id : result.userInfo.id } }
              );
              res.status(200).json({ data: null, message: "ok" })
            }
          } else {
            await User.update(
              { image, aboutMe, location },
              { where: { id : result.userInfo.id } }
            );
            res.status(200).json({ data: null, message: "ok" })
          }
        }
      });
    } catch (err) {
      console.log(err.message);
    }
  }
}