import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';

dotenv.config();

import { User } from "../models/User";
import { Post } from "../models/Post";
import { Tag } from "../models/Tag";
import { PostTag } from "../models/PostTag";
import { Answer } from "../models/Answer";

export const sequelize: Sequelize = new Sequelize({
  host: process.env.HOST,
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  dialect: "mysql",
  models: [User, Post, Tag, PostTag, Answer]
})