const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check , validationResult } = require('express-validator/check');

const Profile = require('../../models/Profile');
const User = require('../../models/User');




//@route  GET api/profile/me
//@desc   Get current users profile 
//@access Private
router.get('/me' , auth , async (req ,res) => {
    try {
      const profile = await Profile.findOne({ user : req.user.id }).populate('user' , [ 'name' , 'avatar']);

      if(!profile) {
        return res.status(400).json({ msg : ' There is no profile for this user'});
      }
      res.json(profile);

    } catch (error) {
      console.error(err.message);
      res.status(500).send('Server Error')
    }
});




//@route  POST api/profile
//@desc   Create or Update a user profile 
//@access Private

router.post(
  '/',
  auth,
  check('status', 'Status is required').notEmpty(),
  check('skills', 'Skills is required').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // destructure the request
    const {
      website,
      skills,
      youtube,
      twitter,
      instagram,
      linkedin,
      facebook,
      // spread the rest of the fields we don't need to check
      ...rest
    } = req.body;

    // build a profile
    const profileFields = {
      user: req.user.id,
      website:
        website && website !== ''
          ? normalize(website, { forceHttps: true })
          : '',
      skills: Array.isArray(skills)
        ? skills
        : skills.split(',').map((skill) => ' ' + skill.trim()),
      ...rest
    };

    // Build socialFields object
    const socialFields = { youtube, twitter, instagram, linkedin, facebook };

    // normalize social fields to ensure valid url
    for (const [key, value] of Object.entries(socialFields)) {
      if (value && value.length > 0)
        socialFields[key] = normalize(value, { forceHttps: true });
    }
    // add to profileFields
    profileFields.social = socialFields;

    try {
      // Using upsert option (creates new doc if no match is found):
      let profile = await Profile.findOneAndUpdate(
        { user: req.user.id },
        { $set: profileFields },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      return res.json(profile);
    } catch (err) {
      console.error(err.message);
      return res.status(500).send('Server Error');
    }
  }
);



//@route  GET api/profile
//@desc   Get all Profiles
//@access Public

router.get('/' , async (req ,res) => {
    try {
      const profiles = await Profile.find().populate('user' , [ 'name' , 'avatar']);
      res.json(profiles);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
});

//@route  GET api/profile/user/:user_id
//@desc   Get profile by user id
//@access Public

router.get('/user/:user_id' , async (req ,res) => {
  try {
    const profile  = await Profile.findOne({ user: req.params.user_id }).populate('user' , [ 'name' , 'avatar']);

    if(!profile) return res.status(400).json({ msg: 'Profile Not Found'});

    res.json(profile);
  } catch (err) {
    console.error(err.message);
    if(err.kind == 'ObjectId')
    return res.status(400).json({ msg: 'Profile Not Found'});

    res.status(500).send('Server Error');
  }
});



//@route  DELETE api/profile
//@desc   Delete profile , user , posts
//@access Private

router.delete('/' , auth ,  async (req ,res) => {
  try {
    // todo -remove user posts

    //Remove profile
      await Profile.findOneAndRemove({ user: req.user.id});

      await User.findOneAndRemove({ _id: req.user.id});

    res.json({ msg: 'User Deleted'});
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});


//@route  PUT api/profile/experience
//@desc   Add profile experience
//@access Private

router.put(
  '/experience',
  auth,
  check('title', 'Title is required').notEmpty(),
  check('company', 'Company is required').notEmpty(),
  check('from', 'From date is required and needs to be from the past')
    .notEmpty()
    .custom((value, { req }) => (req.body.to ? value < req.body.to : true)),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const profile = await Profile.findOne({ user: req.user.id });

      profile.experience.unshift(req.body);

      await profile.save();

      res.json(profile);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route    DELETE api/profile/experience/:exp_id
// @desc     Delete experience from profile
// @access   Private

router.delete('/experience/:exp_id', auth, async (req, res) => {
  try {
    const foundProfile = await Profile.findOne({ user: req.user.id });

    foundProfile.experience = foundProfile.experience.filter(
      (exp) => exp._id.toString() !== req.params.exp_id
    );

    await foundProfile.save();
    return res.status(200).json(foundProfile);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ msg: 'Server error' });
  }
});



module.exports = router;