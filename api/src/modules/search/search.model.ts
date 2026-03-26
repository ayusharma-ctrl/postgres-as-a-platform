import {
    Model,
    DataTypes,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional
} from "sequelize";
import { sequelize } from "../../db";

export class SearchDocument extends Model<
    InferAttributes<SearchDocument>,
    InferCreationAttributes<SearchDocument>
> {
    declare id: string;
    declare title: string;
    declare summary: string;
    declare body: string;
    declare tags: string[];
    declare metadata: Record<string, unknown>;
    declare created_at: CreationOptional<Date>;
    declare updated_at: CreationOptional<Date>;
}

SearchDocument.init(
    {
        id: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false
        },
        title: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        summary: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        body: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        tags: {
            type: DataTypes.ARRAY(DataTypes.TEXT),
            allowNull: false,
            defaultValue: []
        },
        metadata: {
            type: DataTypes.JSONB,
            allowNull: false,
            defaultValue: {}
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
        tableName: "search_documents",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at"
    }
);
