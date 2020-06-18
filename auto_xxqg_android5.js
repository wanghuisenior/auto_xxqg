"ui";
importClass(android.database.sqlite.SQLiteDatabase);
importClass(android.view.View);
// 加载jsoup.jar
runtime.loadJar("./jsoup-1.12.1.jar");
// 使用jsoup解析html
importClass(org.jsoup.Jsoup);
importClass(org.jsoup.nodes.Document);
importClass(org.jsoup.nodes.Element);
importClass(org.jsoup.select.Elements);
/**
 * @Description: Auto.js  (6+6)+(6+6)+(1+1+2)+6+6+1=41分
 * @version: 使用auto.js实现模拟点击，方便完成获取积分
 * @Author: wanghaha
 * sql:查看题库中重复题目：
 * SELECT question, COUNT(question) FROM tiku GROUP BY question HAVING COUNT( question ) > 1
 * @Date: 2020-3-26
 */

var article_count=6 //文章学习篇数， 由于手机型号不同，可能造成重复阅读文章，所以这里学习多阅读于两篇
var article_time=120 //每篇文章学习时长120  ,学习文章同时收听广播，
var mini_video_count=6 //默认学习6个小视频
var mini_video_time=16 //默认学习15秒
var radio_time=1080 //广播收听-18分钟

var challenge_round = 3;//挑战答题轮数
var challenge_answer_everyround = 5;//挑战答题每轮答题数


var commentText = ["加强复工复产，切实做好六保工作","支持党，支持国家！", "为实现中华民族伟大复兴而不懈奋斗！", "紧跟党走，毫不动摇！", "不忘初心，牢记使命", "努力奋斗，报效祖国！"];//评论内容，可自行修改，大于5个字便计分
var article_type="推荐" //这个分类最可能刷新出最新日期的文章。
var myScores = {};//分数
//记录集数组 重要！！！
var dataArray = [];
/**
 * @description: 延时函数
 * @param: seconds-延迟秒数
 * @return: null
 */
function delay(seconds) {
    sleep(1000 * seconds);//sleep函数参数单位为毫秒所以乘1000
}


/********************************************日期控制函数开始***********************************************/
/**
 * @description: 日期转字符串函数
 * @param: y,m,d 日期数字 2019 1 1
 * @return: s 日期字符串 "2019-xx-xx"
 */
function dateToString(y, m, d) {
    var year = y.toString();
    if ((m + 1) < 10) {
        var month = "0" + (m + 1).toString();
    }
    else {
        var month = (m + 1).toString();
    }
    if (d < 10) {
        var day = "0" + d.toString();
    }
    else {
        var day = d.toString();
    }
    var s = year + "-" + month + "-" + day;//年-月-日
    return s;
}

/**
 * @description: 获取当天日期字符串函数
 * @param: null
 * @return: s 日期字符串 "2019-xx-xx"
 */
function getTodayDateString() {
    var date = new Date();
    var y = date.getFullYear();
    var m = date.getMonth();
    var d = date.getDate();

    var s = dateToString(y, m, d);//年-月-日
    return s
}

/**
 * @description: 获取昨天日期字符串函数
 * @param: null
 * @return: s 日期字符串 "2019-xx-xx"
 */
function getYestardayDateString() {
    var date = new Date();
    date.setDate(date.getDate() - 1);
    var y = date.getFullYear();
    var m = date.getMonth();
    var d = date.getDate();
    var s = dateToString(y, m, d);//年-月-日
    return s
}

function indexFromChar(str) {
    return str.charCodeAt(0) - "A".charCodeAt(0);
}
/********************************************日期控制函数结束***********************************************/
/********************************************数据库控制函数开始***********************************************/
/**
 * @description: 从数据库中搜索答案
 * @param: question 问题
 * @return: answer 答案
 */
function getAnswerFromDB(question) {
    var dbName = "tiku.db";
    var path = files.path(dbName);
    if (!files.exists(path)) {
        //files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
        return '';
    }

    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    sql = "SELECT answer FROM tiku WHERE question LIKE '" + question + "%'"
    var cursor = db.rawQuery(sql, null);
    if (cursor.moveToFirst()) {
        var answer = cursor.getString(0);
        cursor.close();
        return answer;
    } else {
        // console.error("题库中未找到答案");
     //    cursor.close();
     //    return '';
        console.error("题库中未找到答案,从tikuNet获取");
        cursor.close();
        var c1=db.rawQuery("SELECT answer FROM tikuNet WHERE question LIKE '" + question + "%'", null);
        if (c1.moveToFirst()) {
            var a = c1.getString(0);
            c1.close();
            console.log("tikuNet答案：",a);
            return a;
        } else {
            console.log("tikuNet中未获取到答案");
            return '';}
    }
}

/**
 * @description: 增加或更新数据库
 * @param: sql
 * @return: null
 */
function insertOrUpdate(question,ansFromDB,correctAnswer) {
    var dbName = "tiku.db";
    var path = files.path(dbName);
    if (!files.exists(path)) {
        //files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
    }
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    if (ansFromDB == "") {       
        var sql = "INSERT INTO tiku VALUES ('" + question + "','" + correctAnswer + "','')";
    } else { //更新题库答案
        var sql = "UPDATE tiku SET answer='" + correctAnswer + "' WHERE question LIKE '" + question + "'";
    }
    db.execSQL(sql);
    db.close();
}

/**
 * @description: 数据库增删改查函数
 * @param: keyword ：根据关键字查询
 * @param: tableName ： 表名，可能是tiku 或者 tikuNet
 * @param: sql : 自定义查询语句，若为空则默认查询所有 包含keyword的题目
 * @return: null
 */
function searchFromDb(keyword, tableName,sql) {
    log(keyword,tableName,sql);
    var dbName = "tiku.db";
    //文件路径
    var path = files.path(dbName);
    //确保文件存在
    
    if (!files.exists(path)) {
        // files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
    }
    //创建或打开数据库
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    if (sql == "") {
        sql = "SELECT question,answer FROM " + tableName + " WHERE question LIKE '%" + keyword + "%'";
    }
    log(sql);
    //sql="select * from tiku"
    //db.execSQL(sql);
    var cursor = db.rawQuery(sql, null);
    cursor.moveToFirst();
    var ansArray = [];
    if (cursor.getCount() > 0) {
        do {
            var timuObj={"question" : cursor.getString(0),"answer":cursor.getString(1)};
            ansArray.push(timuObj);
        } while (cursor.moveToNext());
    } else {
        log("题库中未找到: " + keyword);
    }
    cursor.close();
    return ansArray;
}
function executeSQL(sqlstr) {
    //数据文件名
    var dbName = "tiku.db";
    //文件路径
    var path = files.path(dbName);
    //确保文件存在
    if (!files.exists(path)) {
        // files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
    }
    //创建或打开数据库
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    db.execSQL(sqlstr);
    toastLog(sqlstr);
    db.close();
}
/**
 * 更新网络题库
 */
function updateTikuNet(array) {
    log("开始更新数据库...");
    var dbName = "tiku.db";
    //文件路径
    var path = files.path(dbName);
    //确保文件存在
    if (!files.exists(path)) {
        files.createWithDirs(path);
    }
    //创建或打开数据库
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    var createTable = "\
    CREATE TABLE IF NOt EXISTS tikuNet(\
    question CHAR(253),\
    answer CHAR(100)\
    );";
    ui.run(() => {
        ui.resultLabel.setText("正在清空原有题库...");
    });
    delay(1);
    var cleanTable = "DELETE FROM tikuNet";
    db.execSQL(createTable);
    db.execSQL(cleanTable);
    log("创建打开清空表tikuNet!");
    try{
        var sql = "INSERT INTO tikuNet (question, answer) VALUES (?, ?)";
        db.beginTransaction();
        var stmt = db.compileStatement(sql);
        ui.run(() => {
                ui.resultLabel.setText("正在添加网络题库至本地数据库...");
        });
        delay(1);
        for (var i = 0, len = array.size(); i < len; i++) {
            //log("题目："+li.text());
            var text = array.get(i).text();
            var pos=text.indexOf("】")+1;
            var question=text.substring(pos).replace(/\_/g, "");
            question = question.substring(0, question.lastIndexOf("。") +1)
            question = question.substring(1,question.length)
            var answer = array.get(i).select("b").first().text();
            // log(util.format("题目:%s\n答案:%s"),question,answer);
            stmt.bindString(1, question);
            stmt.bindString(2, answer);
            stmt.executeInsert();
            stmt.clearBindings();
            if (i % 200 == 0) {
                ui.run(() => {
                ui.resultLabel.setText("正在添加网络题库至本地数据库..."+i+",请一定不要离开本页面");
                });
            }
        }
        db.setTransactionSuccessful();
        db.endTransaction();
        db.close();
        ui.run(() => {
                ui.resultLabel.setText("本地数据库更新完毕...共更新"+array.size()+"条数据");
        });
    }catch(e){
        ui.run(() => {
                ui.resultLabel.setText("添加失败！"+e);
        });
    }
}

function getLearnedArticle(title,date){
    var dbName = "tiku.db";
    //文件路径
    var path = files.path(dbName);
    //确保文件存在
    if (!files.exists(path)) {
        // files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
    }
    //创建或打开数据库
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    var createTable = "\
    CREATE TABLE IF NOt EXISTS learnedArticles(\
    title CHAR(500),\
    date CHAR(100)\
    );";
    // var cleanTable = "DELETE FROM tikuNet";
    db.execSQL(createTable);
    // db.execSQL(cleanTable);
    var sql = "SELECT * FROM  learnedArticles WHERE title = '"+ title +"' AND date = '" + date +"'";
    var cursor = db.rawQuery(sql, null);
    var res=cursor.moveToFirst();
    cursor.close();
    db.close();
    return res;
}

function insertLearnedArticle(title,date) {
    var dbName = "tiku.db";
    var path = files.path(dbName);
    if (!files.exists(path)) {
        //files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
    }
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    var createTable = "\
    CREATE TABLE IF NOt EXISTS learnedArticles(\
    title CHAR(253),\
    date CHAR(100)\
    );";
    // var cleanTable = "DELETE FROM tikuNet";
    db.execSQL(createTable);
    var sql = "INSERT INTO learnedArticles VALUES ('" + title + "','" + date + "')";
    db.execSQL(sql);
    db.close();
}

function getLocalTikuNetCount(title,date){
    var dbName = "tiku.db";
    //文件路径
    var path = files.path(dbName);
    //确保文件存在
    if (!files.exists(path)) {
        // files.createWithDirs(path);
        console.error("未找到题库!请将题库放置与js同一目录下");
    }
    //创建或打开数据库
    var db = SQLiteDatabase.openOrCreateDatabase(path, null);
    var cursor = db.rawQuery("SELECT COUNT(*) FROM tikuNet",null);
    var count=0;
    if (cursor.moveToFirst()) {
        count=cursor.getInt(0)
    }
    cursor.close();
    return count;
}
/********************************************数据库控制函数结束***********************************************/
/********************************************每日答题开始***********************************************/
/**
 * @description: 获取填空题题目数组
 * @param: null
 * @return: questionArray
 */
function getFitbQuestion() {
    var questionCollections = className("EditText").findOnce().parent().parent();
    var questionArray = [];
    var findBlank = false;
    var blankCount = 0;
    var blankNumStr = "";
    questionCollections.children().forEach(item => {
        if (item.className() != "android.widget.EditText") {
            if (item.desc() != "") {//题目段
                if (findBlank) {
                    blankNumStr = "|" + blankCount.toString();
                    questionArray.push(blankNumStr);
                    findBlank = false;
                }
                questionArray.push(item.desc());
            }
            else {
                findBlank = true;
                blankCount = (className("EditText").findOnce().parent().childCount() - 1);
            }
        }
    });
    return questionArray;
}


/**
 * @description: 获取选择题题目数组
 * @param: null
 * @return: questionArray
 */
function getChoiceQuestion() {
    var questionCollections = className("ListView").findOnce().parent().child(1);
    var questionArray = [];
    questionArray.push(questionCollections.desc());
    return questionArray;
}



/**
 * @description: 获取提示字符串
 * @param: null
 * @return: tipsStr
 */
function getTipsStr() {
    var tipsStr = "";
    while (tipsStr == "") {
        delay(2);
        if (desc("查看提示").exists()) {
            console.log("点击 查看提示")
            var seeTips = desc("查看提示").findOnce();
            seeTips.click();
            delay(2);
            try{
                click(device.width * 0.5, device.height * 0.41);
                delay(1);
                click(device.width * 0.5, device.height * 0.35);
            }catch(e){}
        } else {
            console.error("未找到查看提示");
            back();
            delay(2);
            back();
        }
        delay(2);//点击 查看提示 后没找到 提示 ，陷入死循环
        if (desc("提示").exists()) {
            var tipsLine = desc("提示").findOnce().parent();
            //获取提示内容
            var tipsView = tipsLine.parent().child(1).child(0);
            tipsStr = tipsView.desc();
            //关闭提示
            tipsLine.child(1).click();
            break;
        }else{//点击 查看提示 后没找到 提示 ，陷入死循环
            console.log("未找到提示。");
            // back();
            // delay(2);
            // back();
        }
    }
    return tipsStr;
}


/**
 * @description: 从提示中获取填空题答案
 * @param: timu, tipsStr
 * @return: ansTips
 */
function getAnswerFromTips(timu, tipsStr) {
    // console.log("timu",timu)
    // console.log("tipsStr",tipsStr)
    var ansTips = "";
    for (var i = 1; i < timu.length - 1; i++) {
        if (timu[i].charAt(0) == "|") {
            var blankLen = timu[i].substring(1);
            var indexKey = tipsStr.indexOf(timu[i + 1]);
            var ansFind = tipsStr.substr(indexKey - blankLen, blankLen);
            ansTips += ansFind;
        }
    }
    return ansTips;
}

/**
 * @description: 根据提示点击选择题选项
 * @param: tipsStr
 * @return: clickStr
 */
function clickByTips(tipsStr) {
    var clickStr = "";
    var isFind = false;
    if (className("ListView").exists()) {
        var listArray = className("ListView").findOne().children();
        listArray.forEach(item => {
            var ansStr = item.child(0).child(2).text();
            if (tipsStr.indexOf(ansStr) >= 0) {
                item.child(0).click();
                clickStr += item.child(0).child(1).text().charAt(0);
                isFind = true;
            }
        });
        if (!isFind) { //没有找到 点击第一个
            listArray[0].child(0).click();
            clickStr += listArray[0].child(0).child(1).text().charAt(0);
        }
    }
    return clickStr;
}



/**
 * @description: 根据答案点击选择题选项
 * @param: answer
 * @return: null
 */
function clickByAnswer(answer) {
    if (className("ListView").exists()) {
        var listArray = className("ListView").findOnce().children();
        listArray.forEach(item => {
            var listIndexStr = item.child(0).child(1).desc().charAt(0);
            //单选答案为非ABCD
            var listDescStr = item.child(0).child(2).desc();
            if (answer.indexOf(listIndexStr) >= 0 || answer == listDescStr) {
                item.child(0).click();
            }
        });
    }
}
/**
 * @description: 检查答案是否正确，并更新数据库
 * @param: question, ansFromDB, answer
 * @return: null
 */
function checkAndUpdate(question, ansFromDB, correct_answer) {
    if (className("Button").desc("下一题").exists() || className("Button").desc("完成").exists()) {//答错了
        try{
            swipe(100, device.height - 100, 100, 100, 500);
        }catch(e){}
        var nCout = 0
        while (nCout < 5) {
            if (descStartsWith("正确答案").exists()) {
                var correctAns = descStartsWith("正确答案").findOnce().desc().substr(5);
                console.info("正确答案是：" + correctAns);
                // if (ansFromDB == "") { //题库为空则插入正确答案                
                //  insertOrUpdate(question,correct_answer);
                //     // var sql = "INSERT INTO tiku VALUES ('" + question + "','" + correctAns + "','')";
                // } else { //更新题库答案
                //  insertOrUpdate(question,correct_answer);
                //     var sql = "UPDATE tiku SET answer='" + correctAns + "' WHERE question LIKE '" + question + "'";
                // }
                insertOrUpdate(question,ansFromDB,correct_answer);
                console.log("更新题库答案...");
                delay(1);
                break;
            } else {
                try{
                    var clickPos = className("android.webkit.WebView").findOnce().child(2).child(0).child(1).bounds();
                    click(clickPos.left + device.width * 0.13, clickPos.top + device.height * 0.1);
                    console.error("未捕获正确答案，尝试修正");
                }catch(e){continue;}
                
            }
            nCout++;
        }
        if (className("Button").exists()) {
            className("Button").findOnce().click();
        } else {
            click(device.width * 0.85, device.height * 0.06);
        }
    } else { //正确后进入下一题，或者进入再来一局界面
        if (ansFromDB == "" && correct_answer != "") { //正确进入下一题，且题库答案为空              
            // var sql = "INSERT INTO tiku VALUES ('" + question + "','" + correct_answer + "','')";
            // insertOrUpdate(sql);
            insertOrUpdate(question,ansFromDB,correct_answer);
            console.log("更新题库答案...");
        }
    }
}
/********************************************挑战答题函数开始***********************************************/
/**
 * @description: 每次答题循环
 * @param: conNum 连续答对的次数
 * @return: null
 */
function challengeQuestionLoop(conNum) {
    if (conNum >= challenge_answer_everyround){//答题次数足够退出，每轮5次
        let listArray = className("ListView").findOnce().children();//题目选项列表
        let i = random(0, listArray.length - 1);
        console.log("本轮次数足够，随机点击一个答案，答错进入下一轮");
        listArray[i].child(0).click();//随意点击一个答案
        console.info("-----------------------------------------------------------");
        return;
    }
    delay(2);
    if (className("ListView").exists()) {
        var question = className("ListView").findOnce().parent().child(0).desc();
        console.log((conNum + 1).toString() + ".题目：" + question);
    } else {
        console.error("提取题目失败!");
        let listArray = className("ListView").findOnce().children();//题目选项列表
        let i = random(0, listArray.length - 1);
        console.log("随机点击一个");
        listArray[i].child(0).click();//随意点击一个答案
        return;
    }
    var chutiIndex = question.lastIndexOf("出题单位");
    if (chutiIndex != -1) {
        question = question.substring(0, chutiIndex - 2);
    }
    question = question.replace(/\s/g, "");
    var options = [];//选项列表
    //总提示未能成功点击，表明这里没有获取到选项列表， 可能和网速有关
    if (className("ListView").exists()) {
        // log("cccc",className("ListView").findOne().children()[0].child(0).child(1).desc())
        className("ListView").findOne().children().forEach(child => {
            var answer_q = child.child(0).child(1).desc();
            if (answer_q=="") {console.log("未获取到选项列表")}
            options.push(answer_q);
        });
    } else {
        console.error("答案获取失败!");
        return;
    }
    var answer = getAnswerFromDB(question);
    console.info("答案：" + answer);

    if (/^[a-zA-Z]{1}$/.test(answer)) {//如果为ABCD形式
        var indexAnsTiku = indexFromChar(answer.toUpperCase());
        answer = options[indexAnsTiku];
        toastLog("answer from char=" + answer);
    }
    let hasClicked = false;
    let listArray = className("ListView").findOnce().children();//题目选项列表

    if (answer == ""){//如果没找到答案
        let i = random(0, listArray.length - 1);
        console.error("没有找到答案，随机点击一个");
        listArray[i].child(0).click();//随意点击一个答案
        hasClicked = true;
        console.info("-----------------------------------------------------------");
    }
    else {//如果找到了答案
        listArray.forEach(item => {
            var listDescStr = item.child(0).child(1).desc();
            if (listDescStr == answer) {
                item.child(0).click();//点击答案
                hasClicked = true;
                console.info("-----------------------------------------------------------");
            }
        });
    }
    if (!hasClicked){//如果没有点击成功
        console.error("未能成功点击，随机点击一个(可能网速过慢)");
        let i = random(0, listArray.length - 1);
        listArray[i].child(0).click();//随意点击一个答案
        console.info("-----------------------------------------------------------");
    }
}

/**
 * @description: 挑战答题
 * @param: null
 * @return: null
 */
function challengeQuestion() {
    console.log("准备开始挑战答题");
    delay(2);
    text("我的").click();
    while (!textContains("我要答题").exists());
    delay(3);
    click("我要答题");
    while (!desc("挑战答题").exists());
    delay(3);
    desc("挑战答题").click();
    console.log("开始挑战答题")
    delay(5); //这里需要多等待几秒钟等待加载出题目，否则报错
    let conNum = 0;// 连续答对的次数
    let current_round = 1;// 轮数
    while (true) {
        challengeQuestionLoop(conNum);
        delay(5);
        if (desc("v5IOXn6lQWYTJeqX2eHuNcrPesmSud2JdogYyGnRNxujMT8RS7y43zxY4coWepspQkvw" +
            "RDTJtCTsZ5JW+8sGvTRDzFnDeO+BcOEpP0Rte6f+HwcGxeN2dglWfgH8P0C7HkCMJOAAAAAElFTkSuQmCC").exists()){//遇到❌号，则答错了,不再通过结束本局字样判断
            if (current_round >= challenge_round && conNum >= challenge_answer_everyround) {
                console.log("挑战答题结束！返回主页！");
                back(); delay(2);
                back(); delay(2);
                back(); delay(2);
                back(); delay(2);
                break;
            } else {
                for (var i = 5; i >= 0; i--) {
                    console.log("等"+i+"秒开始下一轮...")
                    delay(1);
                }
                back();
                //desc("结束本局").click();//有可能找不到结束本局字样所在页面控件，所以直接返回到上一层
                delay(2);
                //desc("再来一局").click();
                back();
                while (!desc("挑战答题").exists());
                delay(2);
                desc("挑战答题").click();
                delay(3);
                if (conNum >= 5) {
                    current_round++;
                }
                conNum = 0;
            }
            console.info("第" + current_round.toString() + "轮开始...")
        } else{//答对了
                conNum++;
            }
    }
}
/********************************************挑战答题函数结束***********************************************/
/********************************************每日答题函数开始***********************************************/

/**
 * @description: 每日答题循环
 * @param: null
 * @return: null
 */
function dailyQuestionLoop() {
    if (descStartsWith("填空题").exists()) {
        console.log('填空题');
        var questionArray = getFitbQuestion();
    }
    else if (descStartsWith("多选题").exists() || descStartsWith("单选题").exists()) {
        console.log('选择题');
        var questionArray = getChoiceQuestion();
    }

    var blankArray = [];
    var question = "";
    questionArray.forEach(item => {
        if (item != null && item.charAt(0) == "|") { //是空格数
            blankArray.push(item.substring(1));
        } else { //是题目段
            question += item;
        }
    });
    question = question.replace(/\s/g, "");
    console.log("题目：" + question);
    delay(2);
    var ansFromDB = getAnswerFromDB(question);
    var correctAnswer = ansFromDB.replace(/(^\s*)|(\s*$)/g, "");

    if (desc("填空题").exists()) {
        if (correctAnswer == "") {
            var tipsStr = getTipsStr();
            correctAnswer = getAnswerFromTips(questionArray, tipsStr);
            console.info("提示中的答案：" + correctAnswer);
            setText(0, correctAnswer.substr(0, blankArray[0]));
            if (blankArray.length > 1) {
                for (var i = 1; i < blankArray.length; i++) {
                    setText(i, correctAnswer.substr(blankArray[i - 1], blankArray[i]));
                }
            }
        } else {
            console.info("答案：" + correctAnswer);
            setText(0, correctAnswer.substr(0, blankArray[0]));
            if (blankArray.length > 1) {
                for (var i = 1; i < blankArray.length; i++) {
                    setText(i, correctAnswer.substr(blankArray[i - 1], blankArray[i]));
                }
            }
        }
    } else if (desc("多选题").exists() || desc("单选题").exists()) {
        if (correctAnswer == "") {
            var tipsStr = getTipsStr();
            correctAnswer = clickByTips(tipsStr);
            console.info("提示中的答案：" + correctAnswer);
        } else {
            console.info("答案：" + ansFromDB);
            clickByAnswer(correctAnswer);
        }
    }

    delay(2);

    if (desc("确定").exists()) {
        desc("确定").click();
        delay(2);
    } else {
        console.warn("未找到右上角确定按钮控件，根据坐标点击");
        try{
            click(device.width * 0.85, device.height * 0.06);//右上角确定按钮，根据自己手机实际修改
        }catch(e){
            //按一下返回键就可以找到
            delay(2);
            back();
            delay(2);
            back();
        }
    }

    if (desc("下一题").exists()) {
        if (desc("下一题").exists()) {
            desc("下一题").click();
            delay(0.5);
        } else {
            console.warn("未找到右上角下一题按钮控件，根据坐标点击");
            try{
                click(device.width * 0.85, device.height * 0.06);//右上角确定按钮，根据自己手机实际修改
            }catch(e){
                console.log("未找到下一题按钮控件，根据坐标点击失败");
            }
        }
    }

    if (desc("完成").exists()) {
        if (desc("完成").exists()) {
            desc("完成").click();
            delay(2);
        } else {
            console.warn("未找到右上角完成按钮控件，根据坐标点击");
            try{
                click(device.width * 0.85, device.height * 0.06);//右上角确定按钮，根据自己手机实际修改
            }catch(e){
                console.log("未找到完成按钮控件，根据坐标点击失败");
            }
        }
    }

    checkAndUpdate(question, ansFromDB, correctAnswer);
    console.info("-----------------------------------------------------------");
    delay(2);
}

/**
 * @description: 每日答题
 * @param: null
 * @return: null
 */
function dailyQuestion() {
    text("我的").click();
    while (!textContains("我要答题").exists());
    delay(1);
    click("我要答题");
    while (!desc("每日答题").exists());
    delay(1);
    desc("每日答题").click();
    console.log("开始每日答题")
    delay(2);
    let dlNum = 0;//每日答题轮数
    while (true) {
        dailyQuestionLoop();
            delay(4);
            dlNum++;
            if (!text("领取奖励已达今日上限").exists()) {
                console.log('再来一组')
                text("再来一组").click();
                console.warn("第" + (dlNum + 1).toString() + "轮答题:");
                delay(1);
            }
            else {
                console.log("每日答题结束！返回主页！")
                text("返回").click(); delay(0.5);
                back(); delay(1);
                back(); delay(1);
                break;
            }
    }
}
/********************************************每日答题函数结束***********************************************/

/**
 * @description: 收藏加分享函数  (收藏+分享)---1+1=2分
 * @param: i-文章标号
 * @return: null
 */
function CollectAndShare(i) {
    while (!textContains("欢迎发表你的观点").exists()){//如果没有找到评论框则认为没有进入文章界面，一直等待
        delay(2);
        console.log("等待进入文章界面")
    }
    console.log("正在进行第" + (i + 1) + "次收藏和分享...");

    var textOrder = text("欢迎发表你的观点").findOnce().drawingOrder();
    var collectOrder = textOrder + 2;
    var shareOrder = textOrder + 3;
    var collectIcon = className("ImageView").filter(function (iv) {
        return iv.drawingOrder() == collectOrder;
    }).findOnce();

    var shareIcon = className("ImageView").filter(function (iv) {
        return iv.drawingOrder() == shareOrder;
    }).findOnce();

    var collectIcon = classNameContains("ImageView").depth(10).findOnce(0);//右下角收藏按钮
    collectIcon.click();//点击收藏
    console.info("收藏成功!");
    delay(2);

    var shareIcon = classNameContains("ImageView").depth(10).findOnce(1);//右下角分享按钮
    shareIcon.click();//点击分享
    while (!textContains("分享到学习强").exists());//等待弹出分享选项界面
    delay(2);
    click("分享到学习强国");
    delay(2);
    console.info("分享成功!");
    back();//返回文章界面
    delay(2);

    collectIcon.click();//再次点击，取消收藏
    console.info("取消收藏!");
    delay(2);
}

/**
 * @description: 评论函数---2分
 * @param: i-文章标号
 * @return: null
 */
function Comment(i) {
    while (!textContains("欢迎发表你的观点").exists()){//如果没有找到评论框则认为没有进入文章界面，一直等待
        delay(1);
        console.log("等待进入文章界面")
    }
    click("欢迎发表你的观点");//单击评论框
    console.log("正在进行第" + (i + 1) + "次评论...");
    delay(2);
    var num = random(0, commentText.length - 1)//随机数
    setText(commentText[num]);//输入评论内容
    delay(2);
    click("发布");//点击右上角发布按钮
    console.info("评论成功!");
    delay(2);
    click("删除");//删除该评论
    delay(2);
    click("确认");//确认删除
    console.info("评论删除成功!");
    delay(2);
}

/**
 * @description: 文章学习计时函数
 * @param: n-文章标号 seconds-学习秒数
 * @return: null
 */
function article_timing(n, seconds) {
    h = device.height;//屏幕高
    w = device.width;//屏幕宽
    x = (w / 3) * 2;
    h1 = (h / 6) * 5;
    h2 = (h / 6);
    for (var i = 0; i <= seconds; i++) {
        while (!textContains("欢迎发表你的观点").exists()){//如果离开了文章界面则一直等待
            console.error("当前已离开第" + (n + 1) + "文章界面，请重新返回文章页面...");
            delay(2);
        }
        if (i % 5 == 0){//每5秒打印一次学习情况
            console.log("第" + (n + 1) + "篇文章已经学习" + i + "秒,剩余" + (seconds - i) + "秒!");
        }
        delay(1);
        if (i % 10 == 0){//每10秒滑动一次，如果android版本<7.0请将此滑动代码删除
            toast("这是防息屏toast,请忽视-。-");
            try{
                if (i <= seconds / 2) {
                    swipe(x, h1, x, h2, 500);//向下滑动,如果没有滑动成功，可能设置的控制台窗口位置不对，导致滑动在控制台上
                } else {
                    swipe(x, h2, x, h1, 500);//向上滑动
                }
            }catch(e){console.log("滑动")}
        }
    }
}

/**
 * @description: 新闻联播小视频学习计时(弹窗)函数
 * @param: n-视频标号 seconds-学习秒数
 * @return: null
 */
function video_timing_news(n, seconds) {
    for (var i = 0; i < seconds; i++) {
        while (!textContains("欢迎发表你的观点").exists())//如果离开了联播小视频界面则一直等待
        {
            console.error("当前已离开第" + (n + 1) + "个新闻小视频界面，请重新返回视频");
            delay(2);
        }
        delay(1);
        console.info("第" + (n + 1) + "个小视频已经观看" + (i + 1) + "秒,剩余" + (seconds - i - 1) + "秒!");
    }
}
/**
 * @description:新闻联播小视频学习函数
 * @param: null
 * @return: null
 */
function videoStudy_news() {
    console.log('点击 电视台');
    click("电视台");
    delay(2)
    console.log('点击 联播频道');
    click("联播频道");
    delay(3);
    var listView = className("ListView");//获取listView视频列表控件用于翻页
    let s = "中央广播电视总台";
    if (!textContains("中央广播电视总台")) {
        s = "央视网";
    }
    for (var i = 0, t = 1; i < mini_video_count;) {
        //console.log("click(s, t)",click(s, t),i,"---",t)
        if (click(s, t) == true) {
            console.log("即将学习第" + (i + 1) + "个新闻联播小视频!");
            video_timing_news(i, mini_video_time);//学习每个新闻联播小片段
            back();//返回联播频道界面
            while (!desc("学习").exists());//等待加载出主页
            delay(5);
            i++;
            t++;
            if (i == 3) {
                listView.scrollForward();//翻页
                delay(2);
                t = 2;
            }
        }
        else {
            listView.scrollForward();//翻页
            delay(2);
            t = 3;
        }
    }
}

/**
 * @description: “百灵”小视频学习函数
 * @param: video_count_bailing ：学习数量， seconds 每个小视频学习时长
 * @return: null
 */
function videoStudy_bailing(mini_video_count, seconds) {
    h = device.height;//屏幕高
    w = device.width;//屏幕宽
    x = (w / 3) * 2;//横坐标2分之3处
    h1 = (h / 6) * 5;//纵坐标6分之5处
    h2 = (h / 6);//纵坐标6分之1处

    click("百灵");
    delay(2);
    click("竖");
    delay(2);
    var a = className("FrameLayout").depth(23).findOnce(0);//根据控件搜索视频框，但部分手机不适配，改用下面坐标点击
    a.click();
    //click((w/2)+random()*10,h/4);//坐标点击第一个视频
    delay(2);
    for (var n = 0; n < mini_video_count; n++) {
        console.log("正在观看第" + (n + 1) + "个百灵小视频");
        for (var i = 0; i < seconds; i++) {
            while (!textContains("分享").exists()){//如果离开了百灵小视频界面则一直等待
                console.error("当前已离开第" + (n + 1) + "个百灵小视频界面，请重新返回视频");
                delay(2);
            }
            delay(1);
            console.info("第" + (n + 1) + "个百灵小视频已经观看" + (i + 1) + "秒,剩余" + (seconds - i - 1) + "秒!");
        }
        if (n != mini_video_count - 1) {
            try{
                swipe(x, h1, x, h2, 500);//往下翻（纵坐标从5/6处滑到1/6处）
            }catch(e){
                console.error("系统版本<7.0，请手动切换!")
            }
        }
    }
    back();
    delay(2);
}

/**
 * @description: 文章学习函数  (阅读文章+文章学习时长)---6+6=12分
 * @param: null
 * @return: null
 */
function article_learn() {
    while (!desc("学习").exists());//等待加载出主页
    console.log("准备开始阅读文章")
    delay(2);
    desc("学习").click();
    delay(2);
    var listView = className("ListView");//获取文章ListView控件用于翻页
    console.log("点击",article_type)
    click(article_type);
    delay(2);
    var zt_flag = false;//判断进入专题界面标志
    var fail = 0;//点击失败次数
    var date_string = getTodayDateString();//获取当天日期字符串
    //获取当前页面上索引为0的，日期为当前日期的新闻标题,注意，只要页面发生了变化，获取到的标题就有可能变化
    // var newsTitle=text(date_string).findOne().parent().parent().parent().children()[0].text()
    for (var i = 0, t = 0; i < article_count;) {
        if (click(date_string, t) == true){//如果点击成功则进入文章页面,不成功意味着本页已经到底,要翻页
            delay(5);
            // // delay(10); //等待加载出文章页面，后面判断是否进入了视频文章播放要用到
            //获取当前正在阅读的文章标题
            var currentNewsTitle=""
            if (textContains("来源").exists()) { // 有时无法获取到 来源
                currentNewsTitle=descContains("来源").findOne().parent().children()[0].desc();
            }else if (textContains("作者").exists()){
                currentNewsTitle=descContains("作者").findOne().parent().children()[0].desc();
            }else if (descContains("来源").exists()){
                currentNewsTitle=descContains("来源").findOne().parent().children()[0].desc();
            }else if (descContains("作者").exists()){
                currentNewsTitle=descContains("作者").findOne().parent().children()[0].desc();
            } else {
                console.log("无法定位文章标题,即将退出并阅读下一篇")
                break;
                t++;
                back();
                delay(2);
                continue;
            }
            if (currentNewsTitle=="") {
                console.log("标题为空,即将退出并阅读下一篇")
                t++;
                back();
                delay(2);
                continue;
            }
            var flag=getLearnedArticle(currentNewsTitle,date_string);
            if (flag) {
                //已经存在，表明阅读过了
                console.info("该文章已经阅读过，即将退出并阅读下一篇");
                t++;
                back();
                delay(2);
                continue;
            }else{
                //没阅读过，添加到数据库
                insertLearnedArticle(currentNewsTitle,date_string);
            }
            let n = 0;
            while (!textContains("欢迎发表你的观点").exists()){//如果没有找到评论框则认为没有进入文章界面，一直等待
                delay(2);
                console.warn("正在等待加载文章界面...");
                if (n > 3){//等待超过3秒则认为进入了专题界面，退出进下一篇文章
                    console.warn("没找到评论框!该界面非文章界面!");
                    zt_flag = true;
                    break;
                }
                n++;
            }
            if (desc("展开").exists()){//如果存在“展开”则认为进入了文章栏中的视频界面需退出
                console.warn("进入了视频界面，即将退出并进下一篇文章!");
                t++;
                back();
                delay(2);
                if(myScores['视听学习时长'] != 6){
                    click("电台");
                    delay(1);
                    click("最近收听");
                    console.log("因为广播被打断，正在重新收听广播...");
                    delay(2);
                    back();
                }
                while (!desc("学习").exists());
                desc("学习").click();
                delay(2);
                continue;
            }
            if (zt_flag == true){//进入专题页标志
                console.warn("进入了专题界面，即将退出并进下一篇文章!");
                t++;
                back();
                delay(2);
                zt_flag = false;
                continue;
            }
            console.log("正在学习第" + (i + 1) + "篇文章,标题：",currentNewsTitle);
            fail = 0;//失败次数清0
            //开始循环进行文章学习
            article_timing(i, article_time);
            if (i < 2){//收藏分享2篇文章
                if (!(myScores["收藏"]==1 && myScores["分享"]==1 &&myScores["发表观点"]==2)) {
                    CollectAndShare(i);//收藏+分享 若c运行到此报错请注释本行！
                    Comment(i);//评论
                }
            }
            delay(2);
            back();//返回主界面
            while (!desc("学习").exists());//等待加载出主页
            delay(2);
            i++;
            t++;//t为实际点击的文章控件在当前布局中的标号,和i不同,勿改动!
        } else {
            // if (i == 0){//如果第一次点击就没点击成功则认为首页无当天文章
            //     date_string = getYestardayDateString();
            //     console.warn("首页没有找到当天文章，即将学习昨日新闻!");
            //     continue;
            // }
            if (fail > 8){//连续翻几页没有点击成功则认为今天的新闻还没出来，学习昨天的
                date_string = getYestardayDateString();
                console.warn("没有找到当天文章，即将学习昨日新闻!");
                continue;
            }
            if (!textContains(date_string).exists()){//当前页面当天新闻
                fail++;//失败次数加一
            }
            listView.scrollForward();//向下滑动(翻页)
            t = 0;
            delay(2);
        }
    }
    
}

/**
 * @description: 听“电台”新闻广播函数  (视听学习+视听学习时长)---6+6=12分
 * @param: null
 * @return: null
 */
function listenToRadio() {
    console.log("准备开始收听广播")
    while (!desc("学习").exists());//等待加载出主页
    desc("学习").click(); //点击主页正下方的"学习"按钮
    delay(2);
    className("android.widget.TextView").text("河南").findOne().parent().click();
    delay(2);
    className("android.widget.TextView").text("河南新闻广播").findOne().parent().click();
    delay(2);
    back();
    //点击学习控件回到新闻首页
    id("home_bottom_tab_button_work").findOne().click();
}
/**
 * @description: 广播学习计时(弹窗)函数
 * @param: r_time-已经收听的时间 seconds-学习秒数
 * @return: null
 */
function radio_timing(r_time, seconds) {
    for (var i = 0; i < seconds; i++) {
        delay(1);
        if (i % 5 == 0)//每5秒打印一次信息
        {
            console.info("广播已经收听" + (i + 1 + r_time) + "秒,剩余" + (seconds - i - 1) + "秒!");
        }
        if (i % 15 == 0)//每15秒弹一次窗防止息屏
        {
            toast("这是防息屏弹窗，可忽略-. -");
        }
    }
}
/**
 * @description: 点击 本地频道 获取1分 ，同时开始收听广播
 * @param: null
 * @return: null
 */
function clickLocalChannel() {
    console.log("点击本地频道,同时开始收听广播");
    delay(2);
    while (!desc("学习").exists());//等待加载出主页
    desc("学习").click(); //点击主页正下方的"学习"按钮
    delay(2);
    className("android.widget.TextView").text("河南").findOne().parent().click();
    delay(2);
    className("android.widget.TextView").text("河南新闻广播").findOne().parent().click();
    delay(2);
    back();
    //点击学习控件回到新闻首页
    id("home_bottom_tab_button_work").findOne().click();
}


/**
 * @description: 获取积分函数
 * @param: null
 * @return: null
 */
function getScores() {
    console.log("正在获取积分...");
    delay(2);
    console.log("点击 积分 ");

    while (!text("积分明细").exists()) {
        if (id("comm_head_xuexi_score").exists()) {
            id("comm_head_xuexi_score").findOnce().click();
        } else if (text("积分").exists()) {
            text("积分").findOnce().parent().child(1).click();
        } else if (className("RelativeLayout").exists()) {
            // className("RelativeLayout").findOnce().child(0).child(0).child(0).child(0).child(2).child(1).click();//为了兼容打包版，js版不用这么丑
        }
        delay(5);
    }
    let err = false;
    while (!err) {
        try {
            className("android.widget.ListView").findOnce().children().forEach(item => {
                let name = item.child(0).child(0).desc();
                let str = item.child(2).desc().split("/");
                let score = str[0].match(/[0-9][0-9]*/g);
                myScores[name] = score;
            });
            err = true;
        } catch (e) {
            console.log("积分获取失败！请确保网络畅通");
            break;
        }
    }
    console.info(myScores);

    article_count = 6 - myScores["阅读文章"];
    article_time = parseInt((6 - myScores["文章学习时长"]) * 120 / article_count) + 10;
    mini_video_count = 6 - myScores["视听学习"];
    radio_time  = (6 - myScores["视听学习时长"]) * 180;
    delay(2);
    back();
    delay(2);
}

/**
 * @description: 启动app
 * @param: null
 * @return: null
 */
function start_app() {
    console.setPosition(0, device.height / 2 - 50);//部分华为手机console有bug请注释本行，这里可能影响滑动
    console.show();//部分华为手机console有bug请注释本行
    console.log("正在启动app...");
    if (!launchApp("学习强国")){//启动学习强国app
        console.error("找不到学习强国App!");
        return;
    }
    while (!desc("学习").exists()) {
        console.log("正在等待加载出主页...若已在其他页面请手动返回主页！");
        delay(1);
    }
    delay(2);
    desc("学习").click();//点击主页正下方的"学习"按钮
    delay(2);
}


//主函数
function main() {
    start_app();//启动app
    var start_time = new Date().getTime();//程序开始时间
    getScores();//获取积分
    if (myScores['本地频道'] == 0) {
        clickLocalChannel();
    }else{
        if (myScores['挑战答题'] != 6 ||myScores['每日答题'] != 6) {
            if(myScores['视听学习时长'] != 6){
                listenToRadio();
            }else console.log("视听学习时长已完成6分");
        }
    }
    
    //开始挑战答题
    if (myScores['挑战答题'] != 6) {
        challengeQuestion();//挑战答题
    }else{console.log("挑战答题已完成6分");}
    delay(2);
    //开始每日答题
    if (myScores['每日答题'] != 6) {
        dailyQuestion();//挑战答题
    }else{console.log("每日答题已完成6分");}
    
    delay(2);
    if (myScores['视听学习'] != 6) {
        //视听学习
        videoStudy_bailing(mini_video_count,mini_video_time);
        videoStudy_news();
    }else{console.log("视听学习已完成6分");}
    delay(2);
    var radio_start = new Date().getTime();//广播开始时间
    if (radio_time != 0) {
        listenToRadio();//听电台广播
    }
    if (myScores['阅读文章'] != 6) {
         //只要没学满6分，每次都从头开始学习
        article_learn();//学习文章，包含点赞、分享和评论
    }else{console.log("阅读文章已完成6分");}
    if (radio_time != 0) {
        listenToRadio();//继续听广播
    }
    delay(2);
    //继续听广播
    var end_time = new Date().getTime();//程序结束时间
    var r_time = (parseInt((end_time - radio_start) / 1000));//广播已经收听的时间
    radio_timing(radio_time, radio_time - r_time);//广播剩余需收听时间

    var all_time=(end_time - start_time) / 1000
    console.log("运行结束,共耗时" + parseInt(all_time / 60) + "分" + parseInt(all_time % 60) + "秒");
}

/********************************************UI部分开始***********************************************/
auto.waitFor();//等待获取无障碍辅助权限
let deviceWidth = device.width;
let deviceHeight = device.height;
let margin = parseInt(deviceWidth * 0.03);
let buttonWidth = parseInt(deviceWidth * 0.40);
ui.layout(
    <vertical margin={margin + "px"} gravity="left|top">
        <horizontal>
            <button margin={margin + "px"} id={"all"} h="60" text={"1 完整运行 "} w={buttonWidth + "px"} />
            <button margin={margin + "px"} id={"challenge"} h="60" text={"2 挑战答题"} w={buttonWidth + "px"} />
        </horizontal>
        
        <horizontal>
            <button margin={margin + "px"}  id={"daily"} h="60" text={"3 每日答题 "} w={buttonWidth + "px"} />
            <button margin={margin + "px"} id={"crud"} h="60" text={"4 手动该题"} w={buttonWidth + "px"} />
        </horizontal>
        <button id="stop" h="45" text="停止运行" />

        <frame id={"crudFrame"} >
            <vertical>
                <input margin={margin + "px"} id={"keyword"} hint={" 请输入要查询的关键字"} w="*" h="auto" />
                <horizontal>
                    <vertical>
                        <text id={"questionLabel"} text={"题目"} />
                        <horizontal>
                            <text id={"questionIndex"} text={"0"} />
                            <text id={"slash"} text={"/"} />
                            <text id={"questionCount"} text={"0"} />
                        </horizontal>
                    </vertical>
                    <input margin={margin + "px"} id={"question"} w="*" h="auto" />
                </horizontal>
                <horizontal>
                    <text id={"answerLabel"} text={"答案"} />
                    <input id={"answer"} w="*" h="auto" />
                </horizontal>
                <horizontal>
                    <button id="search" text=" 查询 " />
                    <button id="lastTen" text=" 最近十条 " />
                    <button id="prev" text=" 上一条 " />
                    <button id="next" text=" 下一条 " />
                </horizontal>
                <horizontal>
                    <button id="update" text=" 修改 " />
                    <button id="delete" text=" 删除 " />
                    <button id="reset" text=" 重置 " />
                    <button id="updateTikuNet" text=" 载入网络题库 " />
                </horizontal>
            </vertical>
        </frame>
        <text id={"resultLabel"} textColor="red" w="*" />
    </vertical>
);
//设置不可见
ui.run(() => {
    ui.crudFrame.setVisibility(View.INVISIBLE);
});
var thread = null;
ui.all.click(function () {
    if (thread != null && thread.isAlive()) {
        toast("当前程序正在运行，请结束之前进程");
        return;
    }
    toast("开始完整运行");
    thread = threads.start(function () {
        main();
    });
});
ui.challenge.click(function () {
    if (thread != null && thread.isAlive()) {
        toast("当前程序正在运行，请结束之前进程");
        return;
    }
    thread = threads.start(function () {
        // challenge_round = ui.challenge_round.getText();
        // qCount = ui.qcount.getText();
        challenge_round=100;
        start_app();
        challengeQuestion();
    });
});
ui.daily.click(function () {
    if (thread != null && thread.isAlive()) {
        toast("当前程序正在运行，请结束之前进程");
        return;
    }
    thread = threads.start(function () {
        start_app();
        console.log("准备开始每日答题");
        delay(2);
        text("我的").click();
        while (!textContains("我要答题").exists());
        delay(3);
        click("我要答题");
        while (!desc("每日答题").exists());
        delay(3);
        desc("每日答题").click();
        console.log("开始每日答题")
        delay(3);
        let dlNum = 0;//每日答题轮数
        while (true) {
            dailyQuestionLoop();
            if (desc("再来一组").exists()) {
                delay(2);
                dlNum++;
                desc("再来一组").click();
                console.info("开始第" + (dlNum + 1).toString() + "轮答题:");
                delay(2);
            }
        }
    });
});
//停止所有正在运行的线程
ui.stop.click(function () {
    if (thread != null && thread.isAlive()) {
        threads.shutDownAll();
        toast("已停止运行！")
        console.hide();
    }
    else {
        toast("当前没有线程在运行！")
    }
});
//开启关闭 手动改题
ui.crud.click(() => {
    if (ui.crudFrame.getVisibility() == View.INVISIBLE) {
        ui.crudFrame.setVisibility(View.VISIBLE);
    } else {
        ui.crudFrame.setVisibility(View.INVISIBLE);
    }
});

//查询 根据关键字
ui.search.click(() => {
    threads.start(function () {
        if (ui.keyword.getText() != "") {
            var keyword = ui.keyword.getText();
            dataArray = searchFromDb(keyword,"tiku","");
            var count = dataArray.length;
            if (count > 0) {
                ui.run(() => {
                    ui.question.setText(dataArray[0].question);
                    ui.answer.setText(dataArray[0].answer);
                    ui.questionIndex.setText("1");
                    ui.questionCount.setText(String(count));
                });
            } else {
                toastLog("未找到");
                ui.run(() => {
                    ui.question.setText("未找到");
                });
            }
        } else {
            toastLog("请输入关键字");
        }
    });
});

//上一条
ui.prev.click(() => {
    threads.start(function () {
        if (dataArray.length > 0) {
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            if (qIndex > 0) {
                ui.run(() => {
                    ui.question.setText(dataArray[qIndex - 1].question);
                    ui.answer.setText(dataArray[qIndex - 1].answer);
                    ui.questionIndex.setText(String(qIndex));
                });
            } else {
                toastLog("已经是第一条了！");
            }
        } else {
            toastLog("题目为空");
        }
    });
});

//下一条
ui.next.click(() => {
    threads.start(function () {
        if (dataArray.length > 0) {
            //toastLog(dataArray);
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            if (qIndex < dataArray.length - 1) {
                //toastLog(qIndex);
                //toastLog(dataArray[qIndex + 1].question);
                ui.run(() => {
                    ui.question.setText(dataArray[qIndex + 1].question);
                    ui.answer.setText(dataArray[qIndex + 1].answer);
                    ui.questionIndex.setText(String(qIndex + 2));
                });
            } else {
                toastLog("已经是最后一条了！");
            }
        } else {
            toastLog("题目为空");
        }
    });
});

//最近十条
ui.lastTen.click(() => {
    threads.start(function () {
        var keyword = ui.keyword.getText();
        dataArray = searchFromDb(keyword, "tiku", "SELECT question,answer FROM tiku ORDER BY rowid DESC limit 10");
        var count = dataArray.length;
        if (count > 0) {
            //toastLog(count);
            ui.run(() => {
                ui.question.setText(dataArray[0].question);
                ui.answer.setText(dataArray[0].answer);
                ui.questionIndex.setText("1");
                ui.questionCount.setText(count.toString());
            });
        } else {
            toastLog("未找到");
            ui.run(() => {
                ui.question.setText("未找到");
            });
        }
    });
});

//修改
ui.update.click(() => {
    threads.start(function () {
        if (ui.question.getText() && dataArray.length > 0 && parseInt(ui.questionIndex.getText()) > 0) {
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            var questionOld = dataArray[qIndex].question;
            var questionStr = ui.question.getText();
            var answerStr = ui.answer.getText();
            var sqlstr = "UPDATE tiku SET question = '" + questionStr + "' , answer = '" + answerStr + " ' WHERE question=  '" + questionOld + "'";
            if(dialogs.confirm("确认修改问题和答案吗？")){
                executeSQL(sqlstr);
            }
        } else {
            toastLog("请先查询");
        }
    });
});

//删除
ui.delete.click(() => {
    threads.start(function () {
        if (dataArray.length > 0 && parseInt(ui.questionIndex.getText()) > 0) {
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            var questionOld = dataArray[qIndex].question;
            var sqlstr = "DELETE FROM tiku WHERE question = '" + questionOld + "'";
            if(dialogs.confirm("确认删除该问题吗？")){
                executeSQL(sqlstr);
            }
        } else {
            toastLog("请先查询");
        }
    });
});

//新增
// <button id="insert" text=" 新增 " />
// ui.insert.click(() => {
//     threads.start(function () {
//         if (ui.question.getText() != "" && ui.answer.getText() != "") {
//             var questionStr = ui.question.getText();
//             var answerStr = ui.answer.getText();
//             var sqlstr = "INSERT INTO tiku VALUES ('" + questionStr + "','" + answerStr + "','')";
//             executeSQL(sqlstr);
//         } else {
//             toastLog("请先输入 问题 答案");
//         }
//     });
// });

//重置
ui.reset.click(() => {
    threads.shutDownAll();
    threads.start(function () {
        dataArray = [];
        ui.run(() => {
            ui.keyword.setText("");
            ui.question.setText("");
            ui.answer.setText("");
            ui.questionIndex.setText("0");
            ui.questionCount.setText("0");
        });
        toastLog("重置完毕!");
    });
});
//更新网络题库
ui.updateTikuNet.click(() => {
    threads.start(function () {
        //当前数据库题目数量， 远程数据库题目数量
        //判读网络中的题库和本地题库  题目是否一样
        var array=[]
        var url = "http://49.235.90.76:5000";
        var count=getLocalTikuNetCount();
        ui.run(() => {
                ui.resultLabel.setText("正在获取网络题库数量...请不要退出app");
                // ui.keyword.setText("http://49.235.90.76:5000");
            });
        try{
            var s=new Date().getTime();
            var htmlString = Jsoup.connect(url).maxBodySize(0).timeout(1000*15).get();
            var htmlArray = Jsoup.parse(htmlString);
            var array = htmlArray.select("li:has(b)");
            var e=new Date().getTime();
            var time=parseInt((e - s) / 1000)
            ui.run(() => {
                ui.resultLabel.setText("从"+url+"获取"+array.size()+"条数据,耗时"+time+"秒\n当前tikuNet数量：" + count);
            });
            if(dialogs.confirm("确认更新网络题库吗？")){
                ui.run(() => {
                    ui.resultLabel.setText("正在更新网络题库...请不要退出app");
                    // ui.keyword.setText("http://49.235.90.76:5000");
                });
                // var url=ui.keyword.getText();
                log("开始更新数据库...");
                updateTikuNet(array);
            }
        }catch(e){
            log(e)
            ui.run(() => {
                ui.resultLabel.setText("请求超时，请重试");
            });
        }
    })
});
/********************************************UI部分结束***********************************************/
