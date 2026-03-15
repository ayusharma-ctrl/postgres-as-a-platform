import {
  Model,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  ForeignKey
} from "sequelize";
import { sequelize } from "../../db";
import { BookingStatus, EventStatus, UserRole } from "./event-booking.types";

export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  declare id: CreationOptional<string>;
  declare name: string;
  declare email: string;
  declare role: UserRole;
  declare is_active: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

export class Event extends Model<
  InferAttributes<Event>,
  InferCreationAttributes<Event>
> {
  declare id: CreationOptional<string>;
  declare organizer_id: ForeignKey<User["id"]>;
  declare title: string;
  declare description: CreationOptional<string | null>;
  declare starts_at: Date;
  declare ends_at: Date;
  declare status: CreationOptional<EventStatus>;
  declare total_tickets: number;
  declare available_tickets: number;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

export class Booking extends Model<
  InferAttributes<Booking>,
  InferCreationAttributes<Booking>
> {
  declare id: CreationOptional<string>;
  declare event_id: ForeignKey<Event["id"]>;
  declare customer_id: ForeignKey<User["id"]>;
  declare quantity: number;
  declare status: CreationOptional<BookingStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    role: {
      type: DataTypes.ENUM("organizer", "customer"),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

Event.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    organizer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "cancelled"),
      defaultValue: "published"
    },
    total_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    available_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "events",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

Booking.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    event_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    customer_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM("pending", "confirmed", "cancelled"),
      defaultValue: "pending"
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "bookings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

Event.belongsTo(User, {
  foreignKey: "organizer_id",
  as: "organizer"
});

User.hasMany(Event, {
  foreignKey: "organizer_id",
  as: "events"
});

Booking.belongsTo(User, {
  foreignKey: "customer_id",
  as: "customer"
});

User.hasMany(Booking, {
  foreignKey: "customer_id",
  as: "bookings"
});

Booking.belongsTo(Event, {
  foreignKey: "event_id",
  as: "event"
});

Event.hasMany(Booking, {
  foreignKey: "event_id",
  as: "bookings"
});
