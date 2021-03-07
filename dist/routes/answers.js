"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.answers = void 0;
const express_1 = require("express");
const answers_1 = require("../controller/answers");
const token_1 = require("../middleware/token");
exports.answers = express_1.Router();
exports.answers.get('/', token_1.tokenChecker, answers_1.controller.get);
exports.answers.post('/', token_1.tokenChecker, answers_1.controller.post);
exports.answers.patch('/', token_1.tokenChecker, answers_1.controller.patch);
exports.answers.delete('/', token_1.tokenChecker, answers_1.controller.delete);
exports.answers.patch('/toggleChoose', token_1.tokenChecker, answers_1.controller.toggleChoose);
exports.answers.patch('/votesUp', token_1.tokenChecker, answers_1.controller.votesUp);
exports.answers.patch('/votesDown', token_1.tokenChecker, answers_1.controller.votesDown);
//# sourceMappingURL=answers.js.map