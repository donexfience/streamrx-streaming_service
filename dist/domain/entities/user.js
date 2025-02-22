"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserEntity = void 0;
class UserEntity {
    constructor(props) {
        this.id = props.id;
        this.username = props.username;
        this.email = props.email;
        this.createdAt = props.createdAt || new Date();
        this.updatedAt = props.updatedAt || new Date();
        this.phone_number = props.phone_number;
        this.date_of_birth = props.date_of_birth;
        this.profileImageURL = props.profileImageURL || "";
        this.social_links = props.social_links || [];
        this.role = props.role || "VIEWER";
        this.bio = props.bio;
        this.tags = props.tags || [];
    }
}
exports.UserEntity = UserEntity;
