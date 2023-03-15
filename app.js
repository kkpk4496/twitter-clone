const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "twitterClone.db");
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running on http://localhost:3000");
    });
  } catch (error) {
    console.log(`Database Error is ${error}`);
    process.exit(1);
  }
};

initializeDbAndServer();

//API-1

app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  //encrypt password
  const hashedPassword = await bcrypt.hash(password, 10);
  // check if user exists
  const checkUserQuery = `select username from user where username = '${username}';`;
  const checkUserResponse = await database.get(checkUserQuery);
  if (checkUserResponse === undefined) {
    const createUserQuery = `
      insert into user(username,name,password,gender,location) 
      values('${username}','${hashedPassword}','${name}',${gender}');`;
    if (password.length > 6) {
      const createUser = await database.run(createUserQuery);
      response.status(200);
      response.send("User created successfully"); //Scenario 3
    } else {
      response.status(400);
      response.send("Password is too short"); //Scenario 2
    }
  } else {
    response.status(400);
    response.send(`User already exists`); //Scenario 1
  }
});

//API-2

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const checkUserQuery = `select * from user where username = '${username}';`;
  const userNameResponse = await database.get(checkUserQuery);
  if (userNameResponse !== undefined) {
    const isPasswordMatched = await bcrypt.compare(
      password,
      userNameResponse.password
    );
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "pavan_secret_key");
      response.send({ jwtToken }); //Scenario 3
    } else {
      response.status(400);
      response.send(`Invalid password`); // Scenario 2
    }
  } else {
    response.status(400);
    response.send(`Invalid user`); //Scenario 1
  }
});

//Authenticate with Jwt token

function authenticationToken(request, response, next) {
  let jwtToken;
  const authHeader = request.headers.authorization;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, "pavan_secret_key", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send(`Invalid JWT Token`); // Scenario 1
      } else {
        next(); //Scenario 2
      }
    });
  } else {
    response.status(401);
    response.send(`Invalid JWT Token`); //Scenario 1
  }
}

//API-3

const convertDbObject=(objectItem) => {
  return {
    username: objectItem.username,
    tweet: objectItem.tweet,
    dateTime: objectItem.date_time,
  };

app.get("/user/tweets/feed/", async (request, response) => {
  const { user_id } = request.params;
  const getDetailsQuery = `
        SELECT 
            *
        FROM
            follower INNER JOIN tweet ON follower.following_user_id = tweet.user_id
        ORDER BY dateTime DESC
        LIMIT 4
        OFFSET 0;`;
  const getDetails = await database.all(getDetailsQuery);
  response.send(convertDbObject(getDetails));
});

//API-4

app.get("/user/following/",async(request,response)=>{
    const {user_id}=request.params;
    const getDetails=`
        SELECT 
            name
        FROM
            user INNER JOIN follower ON user.user_id=follower.following_user_id;`;
    response.send(await database.all(getDetails));
})

//API-5

app.get("/user/followers/",async(request,response)=>{
    const {user_id}=request.params;
    const getDetails=`
        SELECT 
            name
        FROM
            user INNER JOIN follower ON user.user_id=follower.follower_user_id;`;
    response.send(await database.all(getDetails));
})

//API-6

app.get("/tweets/:tweetId/",async(request,response)=>{
    const{user_id}=request.params;
    const getDetails=`select * from tweet inner join follower on tweet.tweet_id=follower.following_user_id;`;
    const getResponse = await database.get(getDetails);
    if (getResponse !== undefined) {
        response.status(401);
        response.send(`Invalid Request`); // Scenario 1
    }
    else {
        getResponse=`
            SELECT 
                tweet from tweet,
                count(like_id) AS likes from like inner join tweet ON like.tweet_id=tweet.tweet_id,
                count(reply_id)AS replies from reply inner join tweet ON reply.tweet_id=tweet.tweet_id,
                date_time AS dateTime from like inner join tweet ON like.tweet_id=tweet.tweet_id;`
        response.send(await database.get(getResponse)); //Scenario 2
    } 
});

//API-7
app.get("/tweets/:tweetId/",async(request,response)=>{
const{user_id}=request.params;
const getDetails=`select * from like inner join follower on like.user_id=follower.following_user_id;`;
    const getResponse = await database.get(getDetails);
    if (getResponse !== undefined) {
        response.status(401);
        response.send(`Invalid Request`); // Scenario 1
    }
    else{
        getResponse=`
            SELECT 
                like_id from like;`;
        response.send(await database.get(getResponse)); //Scenario 2
    }
});

//API-8

app.get("/tweets/:tweetId/replies/",async(request,response)=>{
const{user_id}=request.params;
const getDetails=`select * from reply inner join follower on reply.user_id=follower.following_user_id;`;
    const getResponse = await database.get(getDetails);
    if (getResponse !== undefined) {
        response.status(401);
        response.send(`Invalid Request`); // Scenario 1
    }
    else{
        getResponse=`
            SELECT 
                user_id AS name,reply
            from
                 reply;`;
        response.send(await database.get(getResponse)); //Scenario 2
    }
});

//API-9

app.get("/user/tweets/",async(request,response)=>{
    getResponse=`
        SELECT tweet,count(like_id) as likes,count(reply_id)as replies,data_time as dateTime
        from tweet inner join like on tweet.user_id=like.user_id inner join reply On reply.user_id;`;
    response.send(await database.all(getResponse));
});

//API-10


app.post("/user/tweets/",async (request, response) => {
  const { tweet } = request.body;
  const createQuery = `insert into tweet(tweet) 
  values('${tweet}');`;
  const createResponse = await database.run(createQuery);
  response.send(`Created a Tweet`);
});

//API-11

app.delete("/tweets/:tweetId/",async(request,response)=>{
    const getDetails=`select * from user inner join tweet on user.user_id=tweet.user_id;`;
    if (getDetails!=="undefined"){
        response.status(401);
        response.send(`Invalid Request`); // Scenario 1
    }
    else{
        Output = `
            DELETE 
                *
            FROM
                tweet;`;
        await database.run(Output);
        response.send("Tweet Removed");
    }

})
module.exports = app;
