const passport = require('passport');

// Serialize user for session - store entire user object
passport.serializeUser((user, done) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Serializing user:', { id: user?.id, email: user?.email });
  }
  done(null, user);
});

// Deserialize user from session
passport.deserializeUser((user, done) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('Deserializing user:', { id: user?.id, email: user?.email });
  }
  done(null, user);
});

module.exports = passport;

