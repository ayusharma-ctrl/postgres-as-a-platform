import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from "sequelize";

import { sequelize } from "../../db";

export class Embedding extends Model<
    InferAttributes<Embedding>,
    InferCreationAttributes<Embedding>
> {
    declare id: CreationOptional<string>;
    declare entity_type: string;
    declare entity_id: string;
    declare content: string;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
}

Embedding.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        entity_type: {
            type: DataTypes.STRING,
            allowNull: false
        },
        entity_id: {
            type: DataTypes.STRING,
            allowNull: false
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false
        }
    },
    {
        sequelize,
        tableName: "embeddings",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);