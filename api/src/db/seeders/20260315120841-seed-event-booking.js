'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const startsAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    const organizerId = uuidv4();
    const customerOneId = uuidv4();
    const customerTwoId = uuidv4();
    const eventId = uuidv4();
    const bookingId = uuidv4();

    await queryInterface.bulkInsert('users', [
      {
        id: organizerId,
        name: 'Organizer One',
        email: 'organizer@example.com',
        role: 'organizer',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: customerOneId,
        name: 'Customer One',
        email: 'customer1@example.com',
        role: 'customer',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
      {
        id: customerTwoId,
        name: 'Customer Two',
        email: 'customer2@example.com',
        role: 'customer',
        is_active: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('events', [
      {
        id: eventId,
        organizer_id: organizerId,
        title: 'Launch Meetup',
        description: 'Sample event for booking demo',
        starts_at: startsAt,
        ends_at: endsAt,
        status: 'published',
        total_tickets: 50,
        available_tickets: 48,
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('bookings', [
      {
        id: bookingId,
        event_id: eventId,
        customer_id: customerOneId,
        quantity: 2,
        status: 'confirmed',
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('bookings', null, {});
    await queryInterface.bulkDelete('events', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
