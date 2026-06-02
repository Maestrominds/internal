these project have 2 roles and frontend side.
1st role boss for app(flutter) and web(react)
2nd manager only in web(react)


first i start explaining the project from boss side:
web(react):
1.login page(using credential) and same login page for 2 users
2.boss have three pages{1.list of report,deatils page of report(if boss cick any report from list of report it open details page),third page is list of manager and with add manager button(if click add manager button it opens model to add manager name(50chars limit) email(50 chars limit) and generate password button after we have copy option button )}

2.manager(react):
1.login page(using credential) and same login page for 2 users
2.manager have two pages{1.list of report,details page of report(if manager cick any report from list of report it open details page and with add report model, in that add reeport model have client name input box(50chars limit), amount input box(inr only), note input box(20chars limit), image (up to 5 images, optional),date(calendar icon and it should be today date as default),short description with 200 char limit)}

3.boss(flutter):
*flutter is only for boss, and flutter have same feature as web boss but add manager button/model and list of manager pages wasnt there in flutter only list of report and details of report..


techstaack: frontend: react, flutter, backend: nodejs{same server for both frontend}
db:postgradesql neon
img:storing in cloudnary

some important overview points:
*i didnt have ui for these projects, can you bright theme colour like when client seeing the web/flutter he cant able to find its was made with ai/ the web and flutter ui must want to be professional.
*in boss/manager list of report page only the name &amount will be visible both flutter and react.

*now importantly i give neon db link below and cloudinary credentials for storing images and db credentials for neon.

neon:postgresql://neondb_owner:npg_Fr3oK8WjYZXi@ep-lucky-dream-ao1iojv4-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

cloudinary:
API_KEY:223737975672248
API_SECRET:JIj5e4OA745p0WXvVZAyhPUgAhM
CLOUD_NAME:dnk2dvrfo
