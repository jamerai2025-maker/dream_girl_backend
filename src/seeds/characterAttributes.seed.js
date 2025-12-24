const mongoose = require('mongoose');
const CharacterOccupation = require('../models/CharacterOccupation.model');
const CharacterHobby = require('../models/CharacterHobby.model');
const CharacterRelationship = require('../models/CharacterRelationship.model');
const CharacterFetish = require('../models/CharacterFetish.model');

// Predefined Occupations (from UI screenshots)
const occupations = [
    { name: 'Custom', emoji: '✏️', isCustom: false },
    { name: 'None', emoji: '⚪', isCustom: false },
    { name: 'Stripper', emoji: '💃', isCustom: false },
    { name: 'Food Truck Owner', emoji: '🚚', isCustom: false },
    { name: 'Doctor', emoji: '👨‍⚕️', isCustom: false },
    { name: 'Superhero', emoji: '🦸', isCustom: false },
    { name: 'Professional Gamer', emoji: '🎮', isCustom: false },
    { name: 'Teacher', emoji: '👩‍🏫', isCustom: false },
    { name: 'Artist', emoji: '🎨', isCustom: false },
    { name: 'Social Media Influencer', emoji: '📱', isCustom: false },
    { name: 'Dating Coach', emoji: '💝', isCustom: false },
    { name: 'Life Coach', emoji: '🌱', isCustom: false },
    { name: 'Dominatrix', emoji: '⛓️', isCustom: false },
    { name: 'Dungeon Master', emoji: '🔗', isCustom: false },
    { name: 'Escort', emoji: '💋', isCustom: false },
    { name: 'Warrior', emoji: '⚔️', isCustom: false },
    { name: 'Marine Biologist', emoji: '🐠', isCustom: false },
    { name: 'Lawyer', emoji: '⚖️', isCustom: false },
    { name: 'Engineer', emoji: '🔧', isCustom: false },
    { name: 'Surfing Instructor', emoji: '🏄', isCustom: false },
    { name: 'Chef', emoji: '👨‍🍳', isCustom: false },
    { name: 'Porn Star', emoji: '🔥', isCustom: false },
    { name: 'Skydiving Instructor', emoji: '🪂', isCustom: false },
    { name: 'Mage', emoji: '🔮', isCustom: false },
    { name: 'Musician', emoji: '📖', isCustom: false },
    { name: 'Professional Dog', emoji: '🦮', isCustom: false }
];

// Predefined Hobbies (from UI screenshots)
const hobbies = [
    { name: 'Custom', emoji: '✏️', isCustom: false },
    { name: 'None', emoji: '⚪', isCustom: false },
    { name: 'Reading', emoji: '📚', isCustom: false },
    { name: 'Gaming', emoji: '🎮', isCustom: false },
    { name: 'Cooking', emoji: '🍳', isCustom: false },
    { name: 'Painting', emoji: '🎨', isCustom: false },
    { name: 'Writing', emoji: '✍️', isCustom: false },
    { name: 'Photography', emoji: '📷', isCustom: false },
    { name: 'Playing Guitar', emoji: '🎸', isCustom: false },
    { name: 'Singing', emoji: '🎤', isCustom: false },
    { name: 'Dancing', emoji: '💃', isCustom: false },
    { name: 'Sculpting', emoji: '🗿', isCustom: false },
    { name: 'Knitting', emoji: '🧶', isCustom: false },
    { name: 'Gardening', emoji: '🌿', isCustom: false },
    { name: 'Hiking', emoji: '⛰️', isCustom: false },
    { name: 'Camping', emoji: '🏕️', isCustom: false },
    { name: 'Fishing', emoji: '🎣', isCustom: false },
    { name: 'Bird Watching', emoji: '🦅', isCustom: false },
    { name: 'Stargazing', emoji: '🔭', isCustom: false },
    { name: 'Rock Climbing', emoji: '🧗', isCustom: false },
    { name: 'Yoga', emoji: '🧘', isCustom: false },
    { name: 'Meditation', emoji: '🕉️', isCustom: false },
    { name: 'Running', emoji: '🏃', isCustom: false },
    { name: 'Cycling', emoji: '🚴', isCustom: false },
    { name: 'Swimming', emoji: '🏊', isCustom: false },
    { name: 'Weightlifting', emoji: '🏋️', isCustom: false }
];

// Predefined Relationships (from UI screenshots)
const relationships = [
    { name: 'Custom', emoji: '✏️', isCustom: false },
    { name: 'None', emoji: '⚪', isCustom: false },
    { name: 'Step-Mum', emoji: '👩', isCustom: false },
    { name: 'Step-Sister', emoji: '👭', isCustom: false },
    { name: 'Step-Daughter', emoji: '👧', isCustom: false },
    { name: 'Lover', emoji: '❤️', isCustom: false },
    { name: 'Friend', emoji: '👫', isCustom: false },
    { name: 'Stranger', emoji: '🤷', isCustom: false },
    { name: 'Crush', emoji: '🧡', isCustom: false },
    { name: 'Ex', emoji: '💔', isCustom: false },
    { name: 'Roommate', emoji: '🏠', isCustom: false },
    { name: 'Colleague', emoji: '💼', isCustom: false },
    { name: 'Classmate', emoji: '📚', isCustom: false },
    { name: 'Mentor', emoji: '🎓', isCustom: false },
    { name: 'Student', emoji: '📝', isCustom: false },
    { name: 'Neighbor', emoji: '🏘️', isCustom: false },
    { name: 'Secret Admirer', emoji: '👀', isCustom: false },
    { name: 'Rival', emoji: '⚔️', isCustom: false },
    { name: 'Boss', emoji: '👔', isCustom: false },
    { name: 'Employee', emoji: '📋', isCustom: false },
    { name: 'Family Friend', emoji: '👨‍👩‍👧', isCustom: false },
    { name: 'Therapist', emoji: '🛋️', isCustom: false },
    { name: 'Client', emoji: '💼', isCustom: false },
    { name: 'Online Friend', emoji: '💻', isCustom: false },
    { name: 'Fling', emoji: '🔥', isCustom: false }
];

// Predefined Fetishes (from UI screenshots)
const fetishes = [
    { name: 'Custom', emoji: '✏️', isCustom: false },
    { name: 'None', emoji: '⚪', isCustom: false },
    { name: 'Vanilla', emoji: '🍦', isCustom: false },
    { name: 'Roleplay', emoji: '🎭', isCustom: false },
    { name: 'Lingerie', emoji: '👙', isCustom: false },
    { name: 'High Heels', emoji: '👠', isCustom: false },
    { name: 'Stockings', emoji: '👢', isCustom: false },
    { name: 'Uniforms', emoji: '👗', isCustom: false },
    { name: 'Feet', emoji: '🦶', isCustom: false },
    { name: 'Muscle Worship', emoji: '💪', isCustom: false },
    { name: 'Crossdressing', emoji: '👔', isCustom: false },
    { name: 'Leather', emoji: '🧥', isCustom: false },
    { name: 'Latex', emoji: '🖤', isCustom: false },
    { name: 'Corsets', emoji: '👗', isCustom: false },
    { name: 'Spanking', emoji: '👋', isCustom: false },
    { name: 'Tickling', emoji: '👐', isCustom: false },
    { name: 'Hair Fetish', emoji: '✂️', isCustom: false },
    { name: 'Voyeurism', emoji: '👀', isCustom: false },
    { name: 'Exhibitionism', emoji: '😳', isCustom: false },
    { name: 'Public Play', emoji: '🌆', isCustom: false },
    { name: 'Group Encounters', emoji: '👥', isCustom: false },
    { name: 'Swinging', emoji: '🔄', isCustom: false },
    { name: 'Polyamory', emoji: '💕', isCustom: false },
    { name: 'Blindfolds', emoji: '🦯', isCustom: false },
    { name: 'Gags', emoji: '😶', isCustom: false },
    { name: 'Collars', emoji: '⛓️', isCustom: false }
];

async function seedCharacterAttributes() {
    try {
        console.log('🌱 Starting seed process for character attributes...');

        // Clear existing data
        await CharacterOccupation.deleteMany({ isCustom: false });
        await CharacterHobby.deleteMany({ isCustom: false });
        await CharacterRelationship.deleteMany({ isCustom: false });
        await CharacterFetish.deleteMany({ isCustom: false });

        console.log('🗑️  Cleared existing predefined data');

        // Insert predefined data
        const [occupationDocs, hobbyDocs, relationshipDocs, fetishDocs] = await Promise.all([
            CharacterOccupation.insertMany(occupations),
            CharacterHobby.insertMany(hobbies),
            CharacterRelationship.insertMany(relationships),
            CharacterFetish.insertMany(fetishes)
        ]);

        console.log(`✅ Seeded ${occupationDocs.length} occupations`);
        console.log(`✅ Seeded ${hobbyDocs.length} hobbies`);
        console.log(`✅ Seeded ${relationshipDocs.length} relationships`);
        console.log(`✅ Seeded ${fetishDocs.length} fetishes`);

        console.log('🎉 Seed process completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding character attributes:', error);
        throw error;
    }
}

module.exports = seedCharacterAttributes;
