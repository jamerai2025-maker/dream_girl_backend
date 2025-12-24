// src/seeds/characterPoses.seed.js - Seed data for Character Poses

const mongoose = require('mongoose');
const CharacterPose = require('../models/CharacterPose.model');
const logger = require('../utils/logger');

const poses = [
    // ==================== COMMUNITY POSES ====================
    { name: 'Custom', category: 'Community', emoji: '✨', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, custom pose as per user preference, NSFW explicit view, teasing expression, 8k uhd.' },
    { name: 'Standing', category: 'Community', emoji: '🧍', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, standing, legs slightly apart, arms at sides, NSFW nude, confident expression, 8k uhd.' },
    { name: 'Spread Legs', category: 'Community', emoji: '🦵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, sitting on bed, spread legs, legs apart, NSFW explicit genital view, seductive gaze, 8k uhd.' },
    { name: 'Upskirt', category: 'Community', emoji: '👗', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, bending forward, upskirt, short skirt, NSFW panties visible, playful expression, 8k uhd.' },
    { name: 'On Back', category: 'Community', emoji: '🛏️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, lying on back, arms above head, NSFW nude, relaxed aroused expression, 8k uhd.' },
    { name: 'Kneeling', category: 'Community', emoji: '🧎', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, kneeling, on knees, looking up submissively, NSFW nude, 8k uhd.' },
    { name: 'Yoga', category: 'Community', emoji: '🧘', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, yoga pose, downward dog, flexible body stretched, NSFW nude, sweat on skin, 8k uhd.' },
    { name: 'Splits', category: 'Community', emoji: '🤸', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, splits, legs spread wide, NSFW explicit view, intense expression, 8k uhd.' },
    { name: 'Bent Over', category: 'Community', emoji: '🙇', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, bent over, touching toes, NSFW rear view, teasing smile over shoulder, 8k uhd.' },
    { name: 'Begging', category: 'Community', emoji: '🙏', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, begging pose, on knees, hands clasped, NSFW nude, pleading expression, 8k uhd.' },
    { name: 'Eating', category: 'Community', emoji: '🍽️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, eating pose with food, NSFW topless, sensual biting, 8k uhd.' },
    { name: 'Cuddling', category: 'Community', emoji: '🤗', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, cuddling pose, hugging pillow, NSFW nude, affectionate expression, 8k uhd.' },
    { name: 'Hetero Cuddle', category: 'Community', emoji: '💑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, cuddling, spooning on bed, NSFW nude, intimate, 8k uhd.' },
    { name: 'Dancing', category: 'Community', emoji: '💃', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, dancing, arms raised, NSFW lingerie, energetic expression, 8k uhd.' },
    { name: 'Portrait', category: 'Community', emoji: '🖼️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, close-up portrait, face focus, NSFW topless, sultry gaze, 8k uhd.' },
    { name: 'Lying', category: 'Community', emoji: '🛌', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, lying on side, NSFW nude, relaxed expression, 8k uhd.' },
    { name: 'Sleeping', category: 'Community', emoji: '😴', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, sleeping on bed, NSFW nude, peaceful expression, 8k uhd.' },
    { name: 'Showering', category: 'Community', emoji: '🚿', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, showering, water running, wet body, NSFW nude, sensual expression, 8k uhd.' },
    { name: 'Bath', category: 'Community', emoji: '🛁', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, bathing in tub, bubbles, NSFW nude, relaxed, 8k uhd.' },
    { name: 'Removing Panties', category: 'Community', emoji: '👙', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, removing panties, bending over, pulling down, NSFW explicit, teasing expression, 8k uhd.' },
    { name: 'Pole Dancing', category: 'Community', emoji: '💃', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, pole dancing, spinning on pole, NSFW nude, dynamic expression, 8k uhd.' },
    { name: 'POV Selfie', category: 'Community', emoji: '📱', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, POV selfie, holding phone, mirror reflection, NSFW nude, playful wink, 8k uhd.' },
    { name: 'Selfie', category: 'Community', emoji: '🤳', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, selfie, arm extended, NSFW topless, cute expression, 8k uhd.' },
    { name: 'Flashing', category: 'Community', emoji: '👕', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, flashing, lifting shirt, NSFW breasts exposed, mischievous expression, 8k uhd.' },
    { name: 'Hand Bra', category: 'Community', emoji: '🤲', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, hand bra, covering breasts with hands, NSFW bottomless, shy expression, 8k uhd.' },
    { name: 'Downblouse', category: 'Community', emoji: '👚', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, downblouse, bending forward, loose top, NSFW cleavage and nipples visible, 8k uhd.' },

    // ==================== BODY FOCUS POSES ====================
    { name: 'Boobs', category: 'Body Focus', emoji: '🍒', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, close-up breasts, breast focus, NSFW nude, detailed nipples, 8k uhd.' },
    { name: 'Feet', category: 'Body Focus', emoji: '👣', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, close-up feet, soles facing viewer, NSFW nude, detailed toes, 8k uhd.' },
    { name: 'Feet Closeup', category: 'Body Focus', emoji: '🦶', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, extreme close-up feet, detailed toes and soles, NSFW context, 8k uhd.' },
    { name: 'Kneeling From Behind', category: 'Body Focus', emoji: '🧎', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, kneeling from behind, rear view, arched back, NSFW, 8k uhd.' },
    { name: 'Pussy', category: 'Body Focus', emoji: '🌸', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, close-up pussy, genital focus, NSFW explicit, detailed labia, 8k uhd.' },
    { name: 'Vagina Closeup', category: 'Body Focus', emoji: '🌺', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, extreme close-up vagina, NSFW explicit, hyper-detailed, 8k uhd.' },
    { name: 'All Fours', category: 'Body Focus', emoji: '🐕', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, all fours, on hands and knees, NSFW nude, side view, 8k uhd.' },
    { name: 'Spread Ass', category: 'Body Focus', emoji: '🍑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, spread ass, hands spreading cheeks, NSFW explicit rear view, detailed anus, 8k uhd.' },
    { name: 'Holding Legs', category: 'Body Focus', emoji: '🦵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, lying on back, holding legs back, legs pulled back, NSFW explicit genital view, 8k uhd.' },

    // ==================== MASTURBATION POSES ====================
    { name: 'Stuck', category: 'Masturbation', emoji: '🚪', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, stuck pose, stuck under furniture, NSFW nude, frustrated expression, 8k uhd.' },
    { name: 'Stuck Ass', category: 'Masturbation', emoji: '🧱', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, stuck ass, rear stuck in wall, NSFW explicit, helpless expression, 8k uhd.' },
    { name: 'Pillow Humping', category: 'Masturbation', emoji: '🛏️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, pillow humping, grinding on pillow, NSFW nude, pleasurable expression, 8k uhd.' },
    { name: 'Fingering', category: 'Masturbation', emoji: '👆', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, masturbation, fingering, fingers inside pussy, NSFW explicit, ecstatic expression, 8k uhd.' },
    { name: 'Dildo', category: 'Masturbation', emoji: '🍆', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, dildo, sex toy, inserting toy, NSFW explicit, aroused expression, 8k uhd.' },
    { name: 'Dildo Blowjob', category: 'Masturbation', emoji: '👄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, dildo blowjob, sucking toy, NSFW explicit, seductive gaze, 8k uhd.' },
    { name: 'Squirting', category: 'Masturbation', emoji: '💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, squirting, female ejaculation, orgasm, NSFW explicit, intense expression, 8k uhd.' },
    { name: 'Tentacles', category: 'Masturbation', emoji: '🐙', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, tentacles, tentacles wrapping and penetrating, NSFW explicit, surprised expression, 8k uhd.' },
    { name: 'Dragon Dildo', category: 'Masturbation', emoji: '🐉', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, dragon dildo, riding large fantasy toy, NSFW explicit, pleasurable expression, 8k uhd.' },
    { name: 'Dildo From Below', category: 'Masturbation', emoji: '⬆️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, dildo from below, toy inserted, view from bottom, NSFW explicit, 8k uhd.' },

    // ==================== ORAL POSES ====================
    { name: 'Head For Scale', category: 'Oral', emoji: '📏', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, head for scale, dildo next to face, size comparison, NSFW explicit, 8k uhd.' },
    { name: 'Cock On Head', category: 'Oral', emoji: '🎩', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, cock on head, penis resting on head, NSFW explicit, submissive expression, 8k uhd.' },
    { name: 'Blowjob', category: 'Oral', emoji: '👄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, blowjob, fellatio, penis, cock in mouth, sucking dick, NSFW explicit, eye contact, 8k uhd.' },
    { name: 'Blowjob Side', category: 'Oral', emoji: '↔️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, blowjob, side view, NSFW explicit, passionate expression, 8k uhd.' },
    { name: 'Deepthroat', category: 'Oral', emoji: '😮', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, deepthroat, deep blowjob, penis deep in throat, throat bulge, NSFW explicit, teary eyes, 8k uhd.' },
    { name: 'Face Fuck', category: 'Oral', emoji: '😵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, face fuck, rough blowjob, hands holding head, NSFW explicit, intense expression, 8k uhd.' },
    { name: 'Couch Blowjob', category: 'Oral', emoji: '🛋️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, blowjob, kneeling on floor, couch, living room, NSFW explicit, 8k uhd.' },
    { name: 'Squatting Blowjob', category: 'Oral', emoji: '🦵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, blowjob, squatting pose, NSFW explicit, looking up, 8k uhd.' },
    { name: 'Licking Dick', category: 'Oral', emoji: '👅', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, licking penis, tongue on cock, NSFW explicit, teasing expression, 8k uhd.' },
    { name: 'Footjob', category: 'Oral', emoji: '👣', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, footjob, feet on penis, foot sex, NSFW explicit, playful expression, 8k uhd.' },
    { name: 'Butt Job', category: 'Oral', emoji: '🍑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, butt job, assjob, penis between cheeks, NSFW explicit, rear view, 8k uhd.' },
    { name: 'Prone Blowjob', category: 'Oral', emoji: '🛌', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, oral sex, blowjob, lying on stomach, prone, NSFW explicit, 8k uhd.' },
    { name: 'Nursing Handjob', category: 'Oral', emoji: '🤲', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, handjob, nursing handjob, holding penis, NSFW explicit, caring expression, 8k uhd.' },
    { name: 'POV Eating Out', category: 'Oral', emoji: '👀', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, POV, cunnilingus, eating out, receiving oral, NSFW explicit, pleasurable expression, 8k uhd.' },
    { name: 'Face Sitting', category: 'Oral', emoji: '💺', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, face sitting, sitting on face, NSFW explicit, dominant expression, 8k uhd.' },
    { name: 'Glory Hole', category: 'Oral', emoji: '🕳️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, glory hole, blowjob through wall, NSFW explicit, anonymous, 8k uhd.' },
    { name: 'Under Table', category: 'Oral', emoji: '🪑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, under table, secret blowjob, giving oral, NSFW explicit, stealthy, 8k uhd.' },
    { name: 'Double Blowjob', category: 'Oral', emoji: '👯', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, 1boy, double blowjob, two girls, shared blowjob, NSFW explicit, 8k uhd.' },
    { name: 'Titfuck', category: 'Oral', emoji: '🍒', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, titfuck, paizuri, penis between breasts, breast sex, NSFW explicit, seductive gaze, 8k uhd.' },
    { name: '69 Blowjob', category: 'Oral', emoji: '♋', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, 69 position, mutual oral sex, blowjob and cunnilingus, NSFW explicit, 8k uhd.' },
    { name: 'Post Deepthroat', category: 'Oral', emoji: '😮‍💨', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, post deepthroat, after blowjob, saliva dripping, NSFW explicit, catching breath, 8k uhd.' },
    { name: 'Sloppy BJ', category: 'Oral', emoji: '💧', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, sloppy blowjob, messy oral, lots of saliva, drool, NSFW explicit, 8k uhd.' },
    { name: 'Standing Cunnilingus', category: 'Oral', emoji: '🧍', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, standing cunnilingus, receiving oral while standing, NSFW explicit, ecstatic expression, 8k uhd.' },
    { name: 'Standing Thighjob', category: 'Oral', emoji: '🦵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, standing thighjob, penis between thighs, NSFW explicit, 8k uhd.' },

    // ==================== INTERCOURSE POSES ====================
    { name: 'Missionary', category: 'Intercourse', emoji: '🛏️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, missionary position, penis, penetration, spread legs, NSFW explicit, intimate eye contact, 8k uhd.' },
    { name: 'Side Missionary', category: 'Intercourse', emoji: '↔️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, side missionary, lying on side, NSFW explicit, passionate expression, 8k uhd.' },
    { name: 'Doggy Style', category: 'Intercourse', emoji: '🐕', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, doggystyle, doggy style, penis, sex from behind, bent over, arched back, ass, NSFW explicit, 8k uhd.' },
    { name: 'Doggy Style Front', category: 'Intercourse', emoji: '🐶', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, doggystyle, front view, face towards camera, NSFW explicit, 8k uhd.' },
    { name: 'Anal', category: 'Intercourse', emoji: '🍑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, anal sex, penis, anal penetration, from behind, NSFW explicit, intense expression, 8k uhd.' },
    { name: 'Missionary Anal', category: 'Intercourse', emoji: '🔄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, anal sex, missionary anal, legs up, NSFW explicit, eye contact, 8k uhd.' },
    { name: 'Cowgirl', category: 'Intercourse', emoji: '🤠', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, cowgirl position, penis, girl on top, riding, straddling, NSFW explicit, dominant expression, 8k uhd.' },
    { name: 'Reverse Cowgirl', category: 'Intercourse', emoji: '🔄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, reverse cowgirl, penis, girl on top, facing away, riding, ass view, NSFW explicit, 8k uhd.' },
    { name: 'Full Nelson', category: 'Intercourse', emoji: '🤼', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, full nelson, penis, legs held up, arms locked, NSFW explicit, submissive expression, 8k uhd.' },
    { name: 'Pronebone', category: 'Intercourse', emoji: '🛌', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, pronebone, penis, sex from behind, lying flat, NSFW explicit, 8k uhd.' },
    { name: 'Seated Straddle', category: 'Intercourse', emoji: '🪑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, seated straddle, sitting on lap, NSFW explicit, intimate embrace, 8k uhd.' },
    { name: 'Mating Press', category: 'Intercourse', emoji: '🔥', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, mating press, penis, legs folded back, deep penetration, NSFW explicit, intense expression, 8k uhd.' },
    { name: 'Spooning Sex', category: 'Intercourse', emoji: '🥄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, spooning, penis, side sex, lying on side, NSFW explicit, cozy expression, 8k uhd.' },
    { name: 'Standing Doggy', category: 'Intercourse', emoji: '🧍', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, standing doggy, standing sex, bending over, NSFW explicit, 8k uhd.' },
    { name: 'Standing Splits', category: 'Intercourse', emoji: '🤸', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, standing splits, one leg up, flexible, NSFW explicit, 8k uhd.' },
    { name: 'Standing Anal Sex', category: 'Intercourse', emoji: '🧍', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, anal sex, standing, from behind, NSFW explicit, 8k uhd.' },
    { name: 'Plowcam', category: 'Intercourse', emoji: '📹', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, plowcam, legs over shoulders, NSFW explicit, camera view, 8k uhd.' },
    { name: 'Hair Pulling Doggystyle', category: 'Intercourse', emoji: '💇', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, doggystyle, hair pulling, pulled hair, NSFW explicit, intense expression, 8k uhd.' },
    { name: 'Arm Pulling Missionary', category: 'Intercourse', emoji: '💪', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, missionary, arms pulled back, NSFW explicit, 8k uhd.' },
    { name: 'Against The Wall', category: 'Intercourse', emoji: '🧱', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, against wall, standing sex, pressed against wall, NSFW explicit, 8k uhd.' },
    { name: 'Face Down Ass Up', category: 'Intercourse', emoji: '🍑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, face down ass up, prone, ass raised, submissive pose, NSFW explicit, 8k uhd.' },
    { name: 'Steamy Makeout', category: 'Intercourse', emoji: '💋', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, kissing, passionate kiss, steamy makeout, NSFW nude, 8k uhd.' },
    { name: 'Too Deep', category: 'Intercourse', emoji: '😵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, vaginal sex, too deep, deep penetration, overwhelmed expression, NSFW explicit, 8k uhd.' },
    { name: 'Ready To Ride', category: 'Intercourse', emoji: '🏇', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, ready to ride, squatting over partner, anticipatory expression, NSFW explicit, 8k uhd.' },

    // ==================== GROUP POSES ====================
    { name: 'Gangbang', category: 'Group', emoji: '👥', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, multiple boys, gangbang, group sex, multiple partners, NSFW explicit, overwhelmed expression, 8k uhd.' },
    { name: 'Clone', category: 'Group', emoji: '👯', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, clone, duplicate self, NSFW explicit lesbian, identical features, 8k uhd.' },
    { name: 'Lesbian Kissing', category: 'Group', emoji: '💋', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, kissing, passionate kiss, NSFW nude, 8k uhd.' },
    { name: 'Lesbian Fingering', category: 'Group', emoji: '👆', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, fingering, masturbation, NSFW explicit, pleasure expression, 8k uhd.' },
    { name: 'Lesbian Oral', category: 'Group', emoji: '👅', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, oral sex, cunnilingus, eating pussy, NSFW explicit, 8k uhd.' },
    { name: 'Lesbian 69', category: 'Group', emoji: '♋', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, 69 position, mutual oral sex, NSFW explicit, 8k uhd.' },
    { name: 'Scissoring', category: 'Group', emoji: '✂️', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, scissoring, tribadism, grinding, NSFW explicit, 8k uhd.' },
    { name: 'Lesbian Riding', category: 'Group', emoji: '🏇', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, riding, strap-on, NSFW explicit, dominant, 8k uhd.' },
    { name: 'Lesbian Orgy', category: 'Group', emoji: '👯‍♀️', prompt: 'masterpiece, best quality, photorealistic:1.4, multiple girls, lesbian, orgy, group sex, NSFW explicit, chaotic pleasure, 8k uhd.' },
    { name: 'Lesbian Pegging', category: 'Group', emoji: '🔄', prompt: 'masterpiece, best quality, photorealistic:1.4, 2girls, lesbian, pegging, strap-on, NSFW explicit, role reversal, 8k uhd.' },
    { name: 'Lesbian Sandwich', category: 'Group', emoji: '🥪', prompt: 'masterpiece, best quality, photorealistic:1.4, 3girls, lesbian, sandwich, between two women, NSFW explicit, 8k uhd.' },
    { name: 'Eiffel Tower Side', category: 'Group', emoji: '🗼', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, eiffel tower, side view, NSFW explicit, 8k uhd.' },
    { name: 'Eiffel Tower Standing', category: 'Group', emoji: '🧍', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, eiffel tower, standing, oral and penetration, NSFW explicit, 8k uhd.' },
    { name: 'Female Eiffel Tower', category: 'Group', emoji: '♀️', prompt: 'masterpiece, best quality, photorealistic:1.4, multiple people, eiffel tower, NSFW explicit, group, 8k uhd.' },
    { name: 'MFM Blowjob', category: 'Group', emoji: '👄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, MFM, double blowjob, two penises, NSFW explicit, 8k uhd.' },
    { name: 'MFM Handjob', category: 'Group', emoji: '🤲', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, MFM, double handjob, stroking two penises, NSFW explicit, 8k uhd.' },
    { name: 'Threesome Doggystyle', category: 'Group', emoji: '🐕', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, threesome, doggystyle, oral and penetration, NSFW explicit, 8k uhd.' },
    { name: 'Threesome Missionary', category: 'Group', emoji: '🛏️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, threesome, missionary, NSFW explicit, 8k uhd.' },
    { name: 'Double Penetration', category: 'Group', emoji: '🔞', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, double penetration, DP, two partners, NSFW explicit, overwhelmed expression, 8k uhd.' },

    // ==================== BDSM POSES ====================
    { name: 'Pillory', category: 'BDSM', emoji: '🪵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, pillory, head and hands locked, stocks, NSFW nude, vulnerable expression, 8k uhd.' },
    { name: 'Suspended', category: 'BDSM', emoji: '🪢', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, suspended, hanging from ropes, rope bondage, shibari, NSFW nude, helpless, 8k uhd.' },
    { name: 'Suspended Pussy', category: 'BDSM', emoji: '🎪', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, suspended pussy, legs spread, hanging, NSFW explicit, exposed, 8k uhd.' },
    { name: 'Handcuffs', category: 'BDSM', emoji: '🔗', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, handcuffs, hands cuffed behind back, restrained, NSFW nude, submissive, 8k uhd.' },
    { name: 'Spreader Bar', category: 'BDSM', emoji: '📏', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, spreader bar, legs spread by bar, bound, NSFW explicit, 8k uhd.' },
    { name: 'Swing', category: 'BDSM', emoji: '🎢', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, sex swing, sitting in swing, NSFW nude, anticipatory, 8k uhd.' },
    { name: 'Leash', category: 'BDSM', emoji: '⛓️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, collar, leash, on leash, NSFW nude, obedient expression, 8k uhd.' },
    { name: 'Blindfolded', category: 'BDSM', emoji: '🙈', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, blindfolded, eyes covered, blindfold, NSFW nude, 8k uhd.' },
    { name: 'Gagged', category: 'BDSM', emoji: '🤐', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, gagged, ball gag, mouth gag, NSFW nude, muffled, 8k uhd.' },
    { name: 'Butt Plug', category: 'BDSM', emoji: '🔌', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, butt plug, anal plug, sex toy, rear view, NSFW explicit, 8k uhd.' },
    { name: 'Pegging', category: 'BDSM', emoji: '🔄', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, pegging, strap-on, BDSM, role reversal, NSFW explicit, dominant expression, 8k uhd.' },
    { name: 'Cleave Gag', category: 'BDSM', emoji: '🧣', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, cleave gag, cloth in mouth, bound, NSFW nude, 8k uhd.' },
    { name: 'Ring Gag', category: 'BDSM', emoji: '⭕', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, ring gag, mouth open, drooling, NSFW nude, 8k uhd.' },
    { name: 'Tape Gag', category: 'BDSM', emoji: '📼', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, tape gag, tape over mouth, muffled, NSFW nude, 8k uhd.' },
    { name: 'Bit Gagged', category: 'BDSM', emoji: '🐴', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, bit gag, bit in mouth, NSFW nude, submissive, 8k uhd.' },
    { name: 'Strappado Tie', category: 'BDSM', emoji: '🪢', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, strappado, arms tied behind, rope bondage, NSFW nude, strained, 8k uhd.' },
    { name: 'Suspended Anticipation', category: 'BDSM', emoji: '⏳', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, suspended, hanging, waiting, NSFW nude, tense, 8k uhd.' },
    { name: 'Pressed Into Glass', category: 'BDSM', emoji: '🪟', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, pressed into glass, against window, NSFW nude, smooshed breasts, 8k uhd.' },

    // ==================== AFTERMATH POSES ====================
    { name: 'Cum on Body', category: 'Aftermath', emoji: '💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, after sex, cum on body, semen on skin, covered in cum, NSFW explicit, satisfied expression, 8k uhd.' },
    { name: 'Creampie', category: 'Aftermath', emoji: '💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, after sex, creampie, cum dripping from pussy, semen dripping from vagina, NSFW explicit, post-orgasm, 8k uhd.' },
    { name: 'Bukkake', category: 'Aftermath', emoji: '💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, multiple boys, bukkake, cum on face, multiple cumshots, covered in semen, NSFW explicit, 8k uhd.' },
    { name: 'Cumshot', category: 'Aftermath', emoji: '💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, cumshot, cum on face, facial, semen on face, NSFW explicit, open mouth, 8k uhd.' },
    { name: 'Cumshot Sideview', category: 'Aftermath', emoji: '↔️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, cumshot, sideview, side angle, NSFW explicit, 8k uhd.' },
    { name: 'Cumshot Missionary', category: 'Aftermath', emoji: '🛏️', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, cumshot, missionary position, cum on body, NSFW explicit, 8k uhd.' },
    { name: 'Cumshot Doggystyle', category: 'Aftermath', emoji: '🐕', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, cumshot, doggystyle, cum on back, cum on ass, NSFW explicit, rear view, 8k uhd.' },
    { name: 'Ahegao Breeding', category: 'Aftermath', emoji: '😵', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, ahegao, breeding, creampie, ahegao face, eyes rolled, tongue out, NSFW explicit, 8k uhd.' },
    { name: 'Shy Covering', category: 'Aftermath', emoji: '🙈', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, shy covering, after sex, hands covering, shy expression, NSFW nude, 8k uhd.' },
    { name: 'Fuck Yes', category: 'Aftermath', emoji: '😍', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, fuck yes, climax, orgasm, ecstatic scream, NSFW explicit, 8k uhd.' },
    { name: 'Facial Cumshot', category: 'Aftermath', emoji: '💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, facial, cumshot, cum on face, semen on face, NSFW explicit, 8k uhd.' },
    { name: 'Titfuck Cumshot', category: 'Aftermath', emoji: '🍒', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, titfuck cumshot, cum on breasts, semen on breasts, NSFW explicit, 8k uhd.' },
    { name: 'Throatpie Surprise', category: 'Aftermath', emoji: '😮', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, throatpie, swallowing, cum in throat, NSFW explicit, surprised eyes, 8k uhd.' },
    { name: 'Morning After', category: 'Aftermath', emoji: '🌅', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, morning after, waking up nude, after sex, satisfied smile, NSFW, 8k uhd.' },
    { name: 'Double Creampie', category: 'Aftermath', emoji: '💦💦', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 2boys, double creampie, semen from both holes, NSFW explicit, post-group, 8k uhd.' },

    // ==================== MISCELLANEOUS POSES ====================
    { name: 'Walking Towards', category: 'Miscellaneous', emoji: '🚶', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, walking towards, walking, NSFW nude, inviting expression, dynamic motion, 8k uhd.' },
    { name: 'Jack O Pose Front', category: 'Miscellaneous', emoji: '🎃', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, jack o pose, front view, hands on floor, legs up, NSFW explicit, 8k uhd.' },
    { name: 'Jack O Pose Rear', category: 'Miscellaneous', emoji: '🍑', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, jack o pose, rear view, ass up, NSFW explicit, 8k uhd.' },
    { name: 'Jogging', category: 'Miscellaneous', emoji: '🏃', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, jogging, running, NSFW topless in shorts, energetic, breast bounce, 8k uhd.' },
    { name: 'Squeeze N Moan', category: 'Miscellaneous', emoji: '😩', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, squeezing breasts, self-groping, NSFW nude, moaning expression, 8k uhd.' },
    { name: 'Torso For Scale', category: 'Miscellaneous', emoji: '📏', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, torso for scale, dildo next to body, size comparison, NSFW explicit, 8k uhd.' },
    { name: 'Emotional Kiss', category: 'Miscellaneous', emoji: '💋', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, emotional kiss, passionate kiss, tender, NSFW nude, 8k uhd.' },
    { name: 'Evil Footjob', category: 'Miscellaneous', emoji: '😈', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, 1boy, evil footjob, footjob, wicked smile, NSFW explicit, 8k uhd.' },
    { name: 'Spreading Lips', category: 'Miscellaneous', emoji: '🌸', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, spreading lips, spreading pussy, hands on genitals, NSFW explicit, inviting, 8k uhd.' },
    { name: 'Tentacle DP', category: 'Miscellaneous', emoji: '🐙', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, tentacles, tentacle DP, double penetration by tentacles, NSFW explicit, overwhelmed, 8k uhd.' },
    { name: 'Bound Spread Eagle', category: 'Miscellaneous', emoji: '🦅', prompt: 'masterpiece, best quality, photorealistic:1.4, 1girl, solo, BDSM, bound, spread eagle, tied to bed, rope bondage, NSFW nude, vulnerable, 8k uhd.' }
];

const seedPoses = async () => {
    try {
        // Clear existing predefined poses
        await CharacterPose.deleteMany({ isCustom: false });
        logger.info('🗑️  Cleared existing predefined poses');

        // Insert new poses
        await CharacterPose.insertMany(poses);
        logger.info(`✅ Seeded ${poses.length} character poses`);

        // Log category counts
        const categories = [...new Set(poses.map(p => p.category))];
        for (const category of categories) {
            const count = poses.filter(p => p.category === category).length;
            logger.info(`   - ${category}: ${count} poses`);
        }

    } catch (error) {
        logger.error('Error seeding poses:', error);
        throw error;
    }
};

module.exports = seedPoses;
