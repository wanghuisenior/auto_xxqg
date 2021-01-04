importClass(android.database.sqlite.SQLiteDatabase);
var lCount = 1;//挑战答题轮数
var qCount = randomNum(5, 7);//挑战答题每轮答题数(5~7随机),5次为最高分
var zCount = 2;//争上游答题轮数
var ziXingTi = "选择词语的正确词形。"; //字形题，已定义为全局变量
var zsyDelay = 20; //定义争上游答题延时时间，示例为0-100的随机值，参考某些学习工具的延时时间为100ms，即0.1秒

var path = files.path("/sdcard/Download/tiku.db");
var xxset = JSON.parse(files.read("/sdcard/Download/config.txt"));
function updateToServer(question, answer) {
    //上传到服务器
    if (xxset.update2server) {
        logInfo("开始上传...")
        var res = http.post("http://bldsj.zih718.com:8088/insertOrUpdate",
            {"question": question, "answer": answer});
        var code = res.body.json();
        if (code == 200) {
            logInfo("成功");
        } else if (code == 202) {
        	logInfo("已存在");
        }
    }
}

/**
 * @description: 延时函数
 * @param: seconds-延迟秒数
 * @return: null
 */
function delay(seconds) {
    sleep(1000 * seconds);//sleep函数参数单位为毫秒所以乘1000
}

function logDefault(str) {
    console.log(str);
}

function logInfo(str) {
    console.info(str);
}

function logError(str) {
    console.error(str);
}

/**
 * @description: 生成从minNum到maxNum的随机数
 * @param: minNum-较小的数
 * @param: maxNum-较大的数
 * @return: null
 */
function randomNum(minNum, maxNum) {
    switch (arguments.length) {
        case 1:
            return parseInt(Math.random() * minNum + 1, 10);
        case 2:
            return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
        default:
            return 0;
    }
}
/**
 * @description: 在答题选项画✔，用于各项答题部分
 * @param: x,y 坐标
 * @return: null
 */
function drawfloaty(x, y) {
    //floaty.closeAll();
    var window = floaty.window(
        <frame gravity="center">
        <text id="text" text="✔" textColor="red" />
        </frame>
);
    window.setPosition(x, y - 45);
    return window;
}
/**
 * @description: 从数据库中搜索答案,没有答案就添加(存在即更新),或删除题库中的问题列
 * @param: upOrdel,question,answer;upOrdel:'up'=1,'del'=0
 * @return: null
 */
function UpdateOrDeleteTK(upOrdel, question, answer) {//只针对tiku表，添加/更新或删除相应的列
    if (question == undefined) {
        logDefault("题目为空，返回！");
        return;
    }

    if (upOrdel == "up" || upOrdel == 1) {//更新题库
        let db = SQLiteDatabase.openOrCreateDatabase(path, null);
        if (answer == undefined) {
            logDefault("答案为空，返回！");
            return;
        }

        let sql1 = "SELECT answer FROM tiku WHERE question LIKE '%" + question + "%'"// 关键词前后都加%，增加搜索准确率
        let cursor = db.rawQuery(sql1, null);//查找是否存在
        if (!cursor.moveToFirst()) { //不存在，添加到题库
            sql1 = "INSERT INTO tiku VALUES ('" + question + "','" + answer + "','')";
            logDefault("更新答案到tiku表...");
            db.execSQL(sql1);
            updateToServer(question, answer);
        } else { //修正题库答案
            if (cursor.getString(0) != answer) {   //题库答案和目的答案不一致
                // logError('题库答案:' + cursor.getString(0)); //调试用
                sql1 = "UPDATE tiku SET answer='" + answer + "' WHERE question LIKE '" + question + "'";
                logDefault("修正本地题库答案...");
                db.execSQL(sql1);
                updateToServer(question, answer);
            } else {
                updateToServer(question, answer);
            }
        }
        cursor.close();
        db.close();   //关闭数据库
        delay(1);
    } else if (upOrdel == "del" || upOrdel == 0) {
        let db = SQLiteDatabase.openOrCreateDatabase(path, null);
        let sql2 = "SELECT answer FROM tiku WHERE question LIKE '%" + question + "%'"// 关键词前后都加%，增加搜索准确率
        let cursor = db.rawQuery(sql2, null);//查找是否存在
        if (cursor.moveToFirst()) { //题库存在，删除该列
            sql2 = "DELETE FROM tiku WHERE question LIKE '" + question + "'";//删库语句
            logDefault("删除本地题库的相关题目列...");
            db.execSQL(sql2);
        } else {
            logDefault("本地题库找不到对应的题目，删除失败。");
        }
        cursor.close();
        db.close(); //关闭数据库
        delay(1);
    }
}


function getAnswer(question) {
    let db = SQLiteDatabase.openOrCreateDatabase(path, null);
    let sql1 = "SELECT answer FROM tiku WHERE question LIKE '%" + question + "%'";// 关键词前后都加%，增加搜索准确率
    let sql2 = "SELECT answer FROM tikuNet WHERE question LIKE '%" + question + "%'";
    let answer = "";
    let cursor = db.rawQuery(sql1, null);
    if (cursor.moveToFirst()) {
        answer = cursor.getString(0);
        cursor.close();
        logDefault("tiku答案:" + answer);
        return answer;
    } else {
        cursor = db.rawQuery(sql2, null);
        if (cursor.moveToFirst()) {
            answer = cursor.getString(0);
            cursor.close();
            db.close();
            logDefault("tikuNet答案:" + answer);
            return answer.replace(/(^\s*)|(\s*$)/g, "");;
        } else {
            logDefault("本地未找到答案,请求网络");
            let netTiku = "http://sg89.cn/api/tk1.php"; //在线题库
            let netziXingTi = "选择词语的正确词形%。"; //字形题网络原题，含空格+第一选项，改为通配%
            let netquestion = question.replace(ziXingTi, netziXingTi);//还原字形题的原题目（含空格）+第一个选项
            try {
                let zxda = http.post(netTiku, {//在线答案
                    "t": "da",
                    "q": netquestion
                });
                //判断发送是否成功
                // (zxda.statusCode = 200) {//post成功info
                let zxanswer = zxda.body.json();
                if (zxanswer.code == -1) { //未找到答案
                    logError("网络请求未找到答案...");
                    return '';
                } else {//找到答案 (0||1)
                    let answer = zxanswer.as;//在线答案
                    //添加或更新本地题库答案
                    logDefault("网络答案:" + answer);
                    return answer;//返回答案
                }
            } catch (e) {
                logError("网络请求出错，请检查!");
                return '';
            }
        }
    }
}

function indexFromChar(str) {
    return str.charCodeAt(0) - "A".charCodeAt(0);
}

/**
 * @description: 在答题选项画✔，用于各项答题部分
 * @param: x,y 坐标
 * @return: null
 */


/***************************争上游、双人对战答题部分 开始***************************/
/**
 * @description: 争上游答题 20200928增加
 * @param: null
 * @return: null
 */
function zsyQuestion() {
    if (className("android.view.View").text("开始比赛").exists()) {
    	logDefault("点击 开始比赛");
        className("android.view.View").text("开始比赛").findOne().click();
    }
    delay(5);
    let zNum = 1;//轮数
    logInfo("第" + zNum.toString() + "轮争上游答题开始...")
    while (true) {
        if (className("android.view.View").text("继续挑战").exists() || textContains("继续挑战").exists())//遇到继续挑战，则本局结束
        {
            logInfo("争上游答题本局结束!");
            zNum++;
            //当天上限两次
            if (className("android.view.View").text("非积分奖励局").exists()) {
                logInfo("今日争上游答题积分已完成!");
                zNum++;
            }//
            if (zNum > zCount) {
                if (xxset.forever) {
                    logDefault("无限答题开启");
                    delay(3);//等待5秒才能开始下一轮
                    back();
                    //desc("结束本局").click();//有可能找不到结束本局字样所在页面控件，所以直接返回到上一层
                    delay(2);
                    logDefault("点击 开始比赛");
                    text("开始比赛").click();
                    delay(3);
                    continue;
                }
                logDefault("争上游答题结束");
                //回退返回主页
                back();
                delay(0.5);
                back();
                delay(0.5);
                break;
            } else {
                logDefault("即将开始下一轮...")
                delay(2);//等待2秒开始下一轮
                back();
                delay(1);
                back();
                while (!text("答题练习").exists()) ;//排行榜 答题竞赛
                delay(1);
                className("android.view.View").text("答题练习").findOne().parent().child(8).click();
                logDefault("开始争上游答题")
                delay(2);
                if (className("android.view.View").text("开始比赛").exists()) {
                    className("android.view.View").text("开始比赛").findOne().click();
                }
                delay(6);
            }
            logInfo("第" + zNum.toString() + "轮开始...")
        } else if (!text("继续挑战").exists()) {
            zsyQuestionLoop();
        }
    }
}

/**
 * @description: 双人对战答题 20200928增加
 * @param: null
 * @return: null
 */
function SRQuestion() {
    if (className("android.view.View").text("邀请对手").exists()) {
    	logDefault("点击 邀请对手");
        className("android.view.View").text("邀请对手").findOne().parent().child(0).click();
    }
    delay(1);
    if (className("android.view.View").text("开始对战").exists()) {
    	logDefault("点击 开始对战");
        className("android.view.View").text("开始对战").findOne().click();
    }
    delay(5);
    let zNum = 1;//轮数
    while (true) {
        if (className("android.view.View").text("继续挑战").exists() || textContains("继续挑战").exists() || textContains("请明日再来").exists() || className("android.view.View").text("非积分奖励局").exists()) {//遇到继续挑战，则本局结束
            logInfo("双人对战本局结束!");
            zNum++;
            if (zNum >= zCount) {
                logDefault("双人对战结束！返回主页！");
                if (textContains("知道了").exists()) {//今日次数已超过
                    className("android.widget.Button").text("知道了").findOne().click();
                    delay(1);
                    //back(); delay(1);
                    //back(); delay(1);
                    break;
                }
                //回退返回主页
                back();
                delay(1);
                back();
                delay(1);
                if (text("退出").exists()) {
                    className("android.widget.Button").text("退出").findOne().click();
                    delay(1);
                }
                //back(); delay(1);
                //back(); delay(1);
                break;
            } else {
                logDefault("即将开始下一轮...")
                back();
                delay(1);
                back();
                delay(1);
                if (textContains("退出").exists()) {
                    className("android.widget.Button").text("退出").findOne().click();
                    delay(1);
                }
                while (!text("答题练习").exists()) ;//排行榜 答题竞赛
                delay(1);
                logDefault("开始双人对战")
                delay(2);
                if (className("android.view.View").text("邀请对手").exists()) {
                	logDefault("点击 邀请对手");
                    className("android.view.View").text("邀请对手").findOne().parent().child(0).click();
                }
                delay(1);
                if (className("android.view.View").text("开始对战").exists()) {
                	logDefault("点击 开始对战");
                    className("android.view.View").text("开始对战").findOne().click();
                }
                delay(5);
            }
        } else if (!text("继续挑战").exists()) {
        	//textContains("距离答题结束").exists() && 
            zsyQuestionLoop();
        }
    }
}

/**
 * @description: 争上游答题 双人对战答题循环
 * @param: null
 * @return: null
 */

function zsyQuestionLoop() {
    let ClickAnswer;
    while (className("ListView").exists() && !text("继续挑战").exists()) {
        try {
            if (className("ListView").exists() && !text("继续挑战").exists()) {
                var aquestion = className("ListView").findOnce().parent().child(0).text();
                var question = aquestion.substring(3); //争上游和对战题目前带1.2.3.需去除
            }
            if (aquestion != oldaquestion && question != "") {
                logDefault("题目:" + question);
                logDefault("------------------------");
                var chutiIndex = question.lastIndexOf("出题单位");
                if (chutiIndex != -1) {
                    question = question.substring(0, chutiIndex - 2);
                }

                var options = [];//选项列表
                if (className("ListView").exists()) {
                    className("ListView").findOne().children().forEach(child => {
                        var answer_q = child.child(0).child(1).text();
                        options.push(answer_q);
                    });
                } else {
                    logError("从页面上获取答案失败!");
                    return;
                }

                // 判断是否为字形题，网络搜题和本地搜题
                question = question.replace(/\s/g, "");

                if (question == ziXingTi.replace(/\s/g, "")) {
                    question = question + options[0].substring(3); //字形题在题目后面添加第一选项
                }

                var answer = getAnswer(question);
                if (/^[a-zA-Z]{1}$/.test(answer)) {//如果为ABCD形式
                    var indexAnsTiku = indexFromChar(answer.toUpperCase());
                    answer = options[indexAnsTiku];
                }

                let hasClicked = false;
                let listArray = className("ListView").findOnce().children();//题目选项列表

                logInfo("答案:" + answer);
                logInfo("------------------------");
                //如果找到答案
                if (answer.length != 0) {//如果找到了答案 该部分问题: 选项带A.B.C.D.，题库返回答案不带，char返回答案带
                    var answer_a = answer.substring(0, 2);//定义answer_a，获取答案前两个字符对比A.B.C.D.应该不会出现E选项
                    if (answer_a == "A." || answer_a == "B." || answer_a == "C." || answer_a == "D.") {
                        listArray.forEach(item => {
                            var listDescStrb = item.child(0).child(1).text();
                            if (listDescStrb == answer) {
                                //显示 对号
                                //var b = item.child(0).bounds();
                                //var tipsWindow = drawfloaty(b.left, b.top);
                                item.child(0).click();//点击答案
                                //sleep(randomNum(0, zsyDelay)/2);
                                hasClicked = true;
                                //消失 对号
                                //sleep(randomNum(0, zsyDelay)/2);
                                //tipsWindow.close();
                            }
                        });
                    } else {
                        listArray.forEach(item => {
                            var listDescStra = item.child(0).child(1).text();
                            var listDescStrb = listDescStra.substring(3);//选项去除A.B.C.D.再与answer对比
                            var listDescStrc = listDescStrb.replace(/\s/g, "");
                            if (listDescStrb == answer || listDescStrc == answer) {
                                //显示 对号
                                //var b = item.child(0).bounds();
                                //var tipsWindow = drawfloaty(b.left, b.top);
                                item.child(0).click();//点击答案
                                //sleep(randomNum(0, zsyDelay)/2);
                                hasClicked = true;
                                //消失 对号
                                //sleep(randomNum(0, zsyDelay)/2);
                                //tipsWindow.close();
                            }
                        });
                    }
                }
                if (!hasClicked || answer.length == 0) {//如果没有点击成功，或找不到题目
                    if (!hasClicked) {
                        logError("未能成功点击，随机点击");
                    }
                    if (answer.length == 0) {
                        logError("未找到答案，随机点击");
                    }
                    let i = random(0, listArray.length - 1);
                    listArray[i].child(0).click();//随意点击一个答案
                    hasClicked = true;
                    ClickAnswer = listArray[i].child(0).child(1).text();
                    //记录已点击答案
                    logDefault("随机点击:" + ClickAnswer);
                    logDefault("------------------------");
                }

                var oldaquestion = aquestion; //对比新旧题目
                sleep(randomNum(0, zsyDelay));
                //完成一道题目作答
            }
        } catch (e) {
            logError(e); //输出错误信息，调试用
            // logError("出现错误，请检查!");
            return;
        }
    }
}

/***************************争上游、双人对战答题部分 结束***************************/

/***************************每日、每周、专项答题部分 开始***************************/
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
    var i = 0;
    questionCollections.children().forEach(item => {
        if (item.className() != "android.widget.EditText") {
            if (item.text() != "") {//题目段
                if (findBlank) {
                    blankNumStr = "|" + blankCount.toString();
                    questionArray.push(blankNumStr);
                    findBlank = false;
                }
                questionArray.push(item.text());
            } else {
                findBlank = true;
                blankCount = (className("EditText").findOnce(i).parent().childCount() - 1);
                i++;
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
    questionArray.push(questionCollections.text());
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
        if (text("查看提示").exists()) {
            var seeTips = text("查看提示").findOnce();
            seeTips.click();
            delay(1);
            click(device.width * 0.5, device.height * 0.41);
            delay(1);
            click(device.width * 0.5, device.height * 0.35);
        } else {
            logError("未找到查看提示");
        }
        if (text("提示").exists()) {
            var tipsLine = text("提示").findOnce().parent();
            //获取提示内容
            var tipsView = tipsLine.parent().child(1).child(0);
            tipsStr = tipsView.text();
            //关闭提示
            tipsLine.child(1).click();
            break;
        }
        delay(1);
    }
    return tipsStr;
}


/**
 * @description: 从提示中获取填空题答案
 * @param: timu, tipsStr
 * @return: ansTips
 */
function getAnswerFromTips(timu, tipsStr) {
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
                //显示 对号
                var b = item.child(0).bounds();
                var tipsWindow = drawfloaty(b.left, b.top);
                //时长点击
                sleep(300);
                //点击
                item.child(0).click();
                sleep(300);
                //消失 对号
                tipsWindow.close();
                clickStr += item.child(0).child(1).text().charAt(0);
                isFind = true;
            }
        });
        if (!isFind) { //没有找到 点击第一个
            listArray[0].child(0).click();
            delay(0.3);
            clickStr += listArray[0].child(0).child(1).text().charAt(0);
        }
    }
    return clickStr;
}


/**
 * @description: 根据答案点击选择题选项,10.29修改返回点击成功与否
 * @param: answer
 * @return: null
 */
function clickByAnswer(answer) {
    let hasClicked = false;
    if (className("ListView").exists()) {
        var listArray = className("ListView").findOnce().children();
        listArray.forEach(item => {
            var listIndexStr = item.child(0).child(1).text().charAt(0);
            //单选答案为非ABCD
            var listDescStr = item.child(0).child(2).text();
            var listDescStrc = listDescStr.replace(/\s/g, "");
            if (answer.indexOf(listIndexStr) >= 0 || answer == listDescStr || listDescStrc == answer) {
                //显示 对号
                var b = item.child(0).bounds();
                var tipsWindow = drawfloaty(b.left, b.top);
                //时长点击
                sleep(300);
                //点击
                item.child(0).click();
                sleep(300);
                //消失 对号
                tipsWindow.close();
                hasClicked = true;

            }
        });
        return hasClicked;
    }
}

/**
 * @description: 检查答案是否正确，并更新数据库
 * @param: question, ansTiku, answer
 * @return: null
 */
function checkAndUpdate(question, answer) {
    if (text("答案解析").exists()) {//答错了
        swipe(100, device.height - 100, 100, 100, 500);
        var nCout = 0
        while (nCout < 5) {
            if (textStartsWith("正确答案").exists()) {
                var correctAns = textStartsWith("正确答案").findOnce().text().substr(6);
                logInfo("正确答案是:" + correctAns);
                UpdateOrDeleteTK('up', question, correctAns);//添加或更新到本地题库
                break;

            } else {
                var clickPos = className("android.webkit.WebView").findOnce().child(2).child(0).child(1).bounds();
                logError("未捕获正确答案，尝试修正");
                click(clickPos.left + device.width * 0.13, clickPos.top + device.height * 0.1);
            }
            nCout++;
        }
        var clickNextOk = false;
        if (text("下一题").exists()) {
            clickNextOk = text("下一题").findOnce().click();
            delay(0.5);
        } else if (text("确定").exists()) {
            clickNextOk = text("确定").findOnce().click();
            delay(0.5);
        } else if (text("完成").exists()) {
            clickNextOk = text("完成").findOnce().click();
            delay(0.5);
        }

        if (!clickNextOk) { //按钮点击不成功，坐标点击
            logError("未找到右上角确定按钮控件，根据坐标点击");
            click(device.width * 0.85, device.height * 0.06);//右上角确定按钮，根据自己手机实际修改
            delay(0.5);
        }

    } else { //正确后进入下一题，或者进入再来一局界面
        if (question != "" && answer != "") {
            UpdateOrDeleteTK('up', question, answer);//添加或更新到本地题库
        }
    }
}


/**
 * @description: 每日答题循环
 * @param: null
 * @return: null
 */
function dailyQuestionLoop() {
    if (textStartsWith("填空题").exists()) {
        var questionArray = getFitbQuestion();
    } else if (textStartsWith("多选题").exists() || textStartsWith("单选题").exists()) {
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
    logDefault("题目:" + question);
    logDefault("------------------------");

    var chutiIndex = question.lastIndexOf("出题单位");
    if (chutiIndex != -1) {
        question = question.substring(0, chutiIndex - 2);
    }

    var options = [];//选项列表
    if (!textStartsWith("填空题").exists()) {//选择题提取答案，为字形题准备
        if (className("ListView").exists()) {
            className("ListView").findOne().children().forEach(child => {
                var answer_q = child.child(0).child(2).text();
                options.push(answer_q);
            });
        } else {
            logError("答案获取失败!");
            return;
        }
    }

    // 判断是否为字形题，网络搜题和本地搜题
    question = question.replace(/\s/g, "");

    if (question == ziXingTi.replace(/\s/g, "")) {
        question = question + options[0]; //字形题在题目后面添加第一选项
    }

    var answer = getAnswer(question);
    if (textStartsWith("填空题").exists()) {
        if (answer == "") { //答案空，前面题库未找到答案,找提示
            var tipsStr = getTipsStr();
            answer = getAnswerFromTips(questionArray, tipsStr);
            logInfo("提示中答案:" + answer);
            var answerinput = className("EditText").findOnce().parent().child(0);//10.28修改填空题的输入方法
            answerinput.setText(answer);//10.28修改填空题的输入方法
            delay(0.1);
            /*
            setText(0, answer.substr(0, blankArray[0]));
            if (blankArray.length > 1) {
            for (var i = 1; i < blankArray.length; i++) {
            setText(i, answer.substr(blankArray[i - 1], blankArray[i]));
            }
            }
            */
        } else { //答案非空，题库中已找到答案
            logInfo("答案:" + answer);
            var answerinput = className("EditText").findOnce().parent().child(0);//10.28修改填空题的输入方法
            answerinput.setText(answer);//10.28修改填空题的输入方法
            delay(0.1);
            /*
            setText(0, answer.substr(0, blankArray[0]));
            if (blankArray.length > 1) {
            for (var i = 1; i < blankArray.length; i++) {
            setText(i, answer.substr(blankArray[i - 1], blankArray[i]));
            }
            }
            */
        }
    } else if (textStartsWith("多选题").exists() || textStartsWith("单选题").exists()) {
        if (answer == "") {
            var tipsStr = getTipsStr();
            answer = clickByTips(tipsStr);
            logInfo("提示中答案:" + answer);
        } else {
            logInfo("答案:" + answer);
            var clickAnswerOK = clickByAnswer(answer);
            if (!clickAnswerOK) {//题库答案有误，选项无法点击，进行提示作答
                //ansTiku = '';//为checkAndUpdate准备，更新本地题库答案
                var tipsStr = getTipsStr(); //根据提示找答案
                answer = clickByTips(tipsStr);
                logInfo("重新选择提示的答案:" + answer);
                delay(0.5);
            }
        }
    }

    var clickNextOk = false;
    if (text("下一题").exists()) {
        clickNextOk = text("下一题").findOnce().click();
        delay(0.5);
    } else if (text("确定").exists()) {
        clickNextOk = text("确定").findOnce().click();
        delay(0.5);
    } else if (text("完成").exists()) {
        clickNextOk = text("完成").findOnce().click();
        delay(0.5);
    }

    if (!clickNextOk) { //按钮点击不成功，坐标点击
        logError("未找到右上角确定按钮控件，根据坐标点击");
        click(device.width * 0.85, device.height * 0.06);//右上角确定按钮，根据自己手机实际修改
        delay(0.5);
    }

    checkAndUpdate(question, answer);//检查提示答案，更新本地题库
    logDefault("------------------------");
    delay(2);
}

/**
 * @description: 每日答题
 * @param: null
 * @return: null
 */
function dailyQuestion() {
    let dlNum = 0;//每日答题轮数
    while (true) {
        delay(1)
        if (!(textStartsWith("填空题").exists() || textStartsWith("多选题").exists() || textStartsWith("单选题").exists())) {
            logError("没有找到题目！请检查是否进入答题界面！");
            logDefault("停止");
            break;
        }
        dailyQuestionLoop();
        if (text("再练一次").exists()) {
            logDefault("每周答题结束！")
            text("返回").click();
            delay(2);
            back();
            break;
        } else if (text("查看解析").exists()) {
            logDefault("专项答题结束！")
            back();
            delay(0.5);
            back();
            delay(0.5);
            break;
        } else if (text("再来一组").exists()) {
            delay(2);
            dlNum++;
            if (!text("领取奖励已达今日上限").exists()) {
                logDefault("点击 再来一组");
                text("再来一组").click();
                logInfo("第" + (dlNum + 1).toString() + "轮答题:");
                delay(1);
            } else {
                logDefault("每日答题结束！")
                if (xxset.forever) {
                    logDefault("无限答题开启.");
                    delay(5);
                    logDefault("点击 再来一组");
                    text("再来一组").click();
                    delay(2);//无限答题刷题库
                    continue;
                } 
                //刷一次
                logDefault("点击 返回");
                text("返回").click();
                delay(2);
                //back(); delay(1);
                //back(); delay(1);
                break;
                
            }
        }
    }
}

/***************************每日、每周、专项答题部分 结束***************************/

/***************************挑战答题部分 开始***************************/
/**
 * @description: 挑战答题
 * @param: null
 * @return: null
 */
function challengeQuestion() {
    let conNum = 0;//连续答对的次数
    let lNum = 0;//轮数
    while (true) {
        delay(2);
        if (!className("RadioButton").exists()) {
            logError("没有找到题目！请检查是否进入答题界面！");
            logDefault("停止");
            break;
        }
        challengeQuestionLoop(conNum);
        delay(0.5);
        if (text("v5IOXn6lQWYTJeqX2eHuNcrPesmSud2JdogYyGnRNxujMT8RS7y43zxY4coWepspQkvw" +
            "RDTJtCTsZ5JW+8sGvTRDzFnDeO+BcOEpP0Rte6f+HwcGxeN2dglWfgH8P0C7HkCMJOAAAAAElFTkSuQmCC").exists())//遇到❌号，则答错了,不再通过结束本局字样判断
        {
            if (conNum >= qCount) {
                lNum++;
            }
            if (lNum >= lCount) {
                if (xxset.forever) {
                    logDefault("无限答题开启");
                    delay(3);//等待5秒才能开始下一轮
                    back();
                    //desc("结束本局").click();//有可能找不到结束本局字样所在页面控件，所以直接返回到上一层
                    delay(2);
                    logDefault("点击 再来一局");
                    text("再来一局").click();
                    delay(3);
                    continue;
                }
                logDefault("挑战答题结束！返回积分界面！");
                delay(2);
                back();
                delay(1);
                back();
                delay(1);
                break;
            } else {
                logDefault("出现错误，等5秒开始下一轮...")
                delay(3);//等待5秒才能开始下一轮
                back();
                //desc("结束本局").click();//有可能找不到结束本局字样所在页面控件，所以直接返回到上一层
                delay(2);
                logDefault("点击 再来一局");
                text("再来一局").click();
                delay(4);
                if (conNum < 5) {
                    conNum = 0;
                }
            }
        } else//答对了
        {
            conNum++;
        }
    }
    conNum = 0;
}

/**
 * @description: 每次答题循环
 * @param: conNum 连续答对的次数
 * @return: null
 */
function challengeQuestionLoop(conNum) {
    let ClickAnswer;
    if (className("ListView").exists()) {
        var question = className("ListView").findOnce().parent().child(0).text();
        logDefault((conNum + 1).toString() + ".题目:" + question);
        logDefault("------------------------");
    } else {
        logError("提取题目失败!");
        let listArray = className("ListView").findOnce().children();//题目选项列表
        let i = random(0, listArray.length - 1);
        listArray[i].child(0).click();//随意点击一个答案
        ClickAnswer = listArray[i].child(0).child(1).text();
        //记录已点击答案
        logDefault("随机点击:" + ClickAnswer);
        logDefault("------------------------");
        return;
    }

    var chutiIndex = question.lastIndexOf("出题单位");
    if (chutiIndex != -1) {
        question = question.substring(0, chutiIndex - 2);
    }

    if (conNum >= qCount)//答题次数足够退出，每轮5次
    {
        let listArray = className("ListView").findOnce().children();//题目选项列表
        let i = random(0, listArray.length - 1);
        logDefault("今天答题次数已够，随机点击一个答案");
        listArray[i].child(0).click();//随意点击一个答案
        ClickAnswer = listArray[i].child(0).child(1).text();
        //记录已点击答案
        logDefault("随机点击:" + ClickAnswer);
        logDefault("------------------------");
        //随机点击答案正确，更新到本地题库tiku表
        delay(0.5);//等待0.5秒，是否出现X
        if (!text("v5IOXn6lQWYTJeqX2eHuNcrPesmSud2JdogYyGnRNxujMT8RS7y43zxY4coWepspQkvw" +
            "RDTJtCTsZ5JW+8sGvTRDzFnDeO+BcOEpP0Rte6f+HwcGxeN2dglWfgH8P0C7HkCMJOAAAAAElFTkSuQmCC").exists()) {
            logDefault("随机点击答案正确，更新至本地题库");
            UpdateOrDeleteTK('up', question, ClickAnswer);//添加或更新到本地题库
        }
        return;
    }

    var options = [];//选项列表
    if (className("ListView").exists()) {
        className("ListView").findOne().children().forEach(child => {
            var answer_q = child.child(0).child(1).text();
            options.push(answer_q);
        });
    } else {
        logError("从页面获取答案失败!");
        return;
    }

    // 判断是否为字形题，网络搜题和本地搜题
    question = question.replace(/\s/g, "");

    if (question == ziXingTi.replace(/\s/g, "")) {
        question = question + options[0]; //字形题在题目后面添加第一选项
    }

    var answer = getAnswer(question);
    if (/^[a-zA-Z]{1}$/.test(answer)) {//如果为ABCD形式
        var indexAnsTiku = indexFromChar(answer.toUpperCase());
        answer = options[indexAnsTiku];
    }

    let hasClicked = false;
    let listArray = className("ListView").findOnce().children();//题目选项列表

    logInfo("答案:" + answer);
    //如果找到答案
    if (answer.length != 0)//如果到答案
    {
        var clickAns = "";
        listArray.forEach(item => {
            var listDescStr,listDescStrc;
            try{
                listDescStr = item.child(0).child(1).text();
                listDescStrc = listDescStr.replace(/\s/g, "");
            }catch(e){
                logError(e);
                logError("出现错误，请检查4");
            }
            if (listDescStr == answer || listDescStrc == answer) {
                clickAns = answer;
                //显示 对号
                var b = item.child(0).bounds();
                var tipsWindow = drawfloaty(b.left, b.top);
                //随机时长点击
                delay(0.1);
                //点击
                item.child(0).click();
                hasClicked = true;
                delay(0.1);
                //消失 对号
                tipsWindow.close();
            }
        });
    }
    if (!hasClicked || answer.length == 0) {//如果没有点击成功，或找不到题目
        logError("未找到答案或未能成功点击，准备随机点击");
        delay(0.3);
        let i = random(0, listArray.length - 1);
        listArray[i].child(0).click();//随意点击一个答案
        ClickAnswer = listArray[i].child(0).child(1).text();
        //记录已点击答案
        logDefault("随机点击:" + ClickAnswer);
        //随机点击答案正确，更新到本地题库tiku表
        delay(0.5);//等待0.5秒，是否出现X
        if (!text("v5IOXn6lQWYTJeqX2eHuNcrPesmSud2JdogYyGnRNxujMT8RS7y43zxY4coWepspQkvw" +
            "RDTJtCTsZ5JW+8sGvTRDzFnDeO+BcOEpP0Rte6f+HwcGxeN2dglWfgH8P0C7HkCMJOAAAAAElFTkSuQmCC").exists()) {
            logDefault("随机点击答案正确，正在准备更新本地题库");
            UpdateOrDeleteTK('up', question, ClickAnswer);//添加或更新到本地题库
        }
    } else {//从题库中找到答案，点击成功，但如果错误
        delay(0.5);//等待0.5秒，是否出现X
        if (text("v5IOXn6lQWYTJeqX2eHuNcrPesmSud2JdogYyGnRNxujMT8RS7y43zxY4coWepspQkvw" +
            "RDTJtCTsZ5JW+8sGvTRDzFnDeO+BcOEpP0Rte6f+HwcGxeN2dglWfgH8P0C7HkCMJOAAAAAElFTkSuQmCC").exists()) {
            logDefault("题库答案点击错误，删除本地题库的错误答案");
            UpdateOrDeleteTK('del', question, answer);//删除本地题库的错误答案
        }
    }
    logDefault("------------------------");
}

/***************************挑战答题部分 结束***************************/

function main() {
    console.setPosition(0, device.height / 2);
    console.show();
    delay(1);

    if (className("android.view.View").text("开始比赛").exists()) {//争上游答题开始页
        logDefault("开始争上游答题");
        zsyQuestion();
    } else if (className("android.view.View").text("开始对战").exists()) {//双人对战开始页
        logDefault("开始双人对战答题");
        SRQuestion();
    } else if ((textStartsWith("填空题").exists() || textStartsWith("多选题").exists() || textStartsWith("单选题").exists())) {//每日答题等有单选或多选题
        logDefault("开始 每日/每周/专项 答题");
        dailyQuestion();
    } else if (className("ListView").exists()) {//答题界面
        var questionNum = className("ListView").findOnce().parent().child(0).text().substring(0, 2); //争上游和对战题目前带序号1.
        if (questionNum != "1.") {
            //不含序号“1.”，且不提示单选或多选题，则判断为挑战答题界面
            logDefault("准备开始挑战答题");
            challengeQuestion();
        }
    } else {
        logError("没有找到答题开始页！");
        logDefault("");
        //打开我要答题界面
        logDefault("请手动打开答题界面再重试 !");
        logDefault("争上游和双人挑战在 开始挑战/对战 的界面）");
    }
//console.hide();
}

//main();
module.exports = main;
