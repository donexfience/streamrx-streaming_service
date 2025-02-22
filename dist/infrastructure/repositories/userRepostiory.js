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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const user_1 = require("../models/user");
const dbConfig_1 = require("../../config/dbConfig");
const user_2 = require("../../domain/entities/user");
class UserRepository {
    constructor() {
        this.userRepository = dbConfig_1.AppDataSource.getRepository(user_1.UserModel);
    }
    createUser(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const userModel = this.userRepository.create(user);
            const savedUser = yield this.userRepository.save(userModel);
            return new user_2.UserEntity(savedUser);
        });
    }
    updateUser(id, user) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.userRepository.update(id, user);
            const updatedUser = yield this.userRepository.findOneBy({ id });
            return updatedUser ? new user_2.UserEntity(updatedUser) : null;
        });
    }
    findUserById(id) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findOneBy({ id });
            return user ? new user_2.UserEntity(user) : null;
        });
    }
    findUserByEmail(email) {
        return __awaiter(this, void 0, void 0, function* () {
            const user = yield this.userRepository.findOneBy({ email });
            return user ? new user_2.UserEntity(user) : null;
        });
    }
}
exports.UserRepository = UserRepository;
