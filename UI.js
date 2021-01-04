"ui";
importClass(android.database.sqlite.SQLiteDatabase);
importClass(android.view.View);
var tikuCommon = require("./tikuCommon.js");
let deviceWidth = device.width;

let margin = parseInt(deviceWidth * 0.02);

//记录集数组 重要！！！
let qaArray = [];
var path = files.path("/sdcard/Download/tiku.db");
//确保文件存在
if (!files.exists(path)) {
    //如果sdcard/download不存在tiku.db，则复制默认的题库文件到该目录
    files.copy("tiku.db", path);
}
ui.layout(
    <drawer id="drawer">
        <vertical>
            <appbar>
                <toolbar id="toolbar" title="懒人学习" />
                <tabs id="tabs" />
            </appbar>
            <viewpager id="viewpager">
                <frame>
                	<vertical>
        			<text textSize="16sp" textColor="red" text="题库://sdcard//Download//tiku.db" />
                    <text textSize="16sp" textColor="red" text="修改config.json可实现多账户学习" />
                    <text id={"tikuLable"} textColor="red" w="*" />
    				</vertical>
                    <vertical>
                    <button id="amsw" text="阅读模式选择" layout_gravity="right|top" w="auto" h="auto" circle="true"/>
                    <button id="update2server" text="题库上传开关" layout_gravity="right|top" w="auto" h="auto" circle="true"/>
                    <button id="forever" text="无限刷题开关" layout_gravity="right|top" w="auto" h="auto" circle="true"/>
                    </vertical>
                    <button id="showFloating" text="打开悬浮窗" w="150" h="60" circle="true" layout_gravity="center" style="Widget.AppCompat.Button.Colored" />
                </frame>
                <frame>
                    <vertical>
                        <horizontal gravity="center">
                            <input margin={margin + "px"} id="keyword" hint=" 输入题目或答案关键字" h="auto" />
                            <radiogroup orientation="horizontal" >
                                <radio id="rbQuestion" text="题目" checked="true" />
                                <radio id="rbAnswer" text="答案" />
                            </radiogroup>
                            <button id="search" text=" 搜索 " />
                        </horizontal>
                        <horizontal gravity="center">
                            <button id="lastTen" text=" 最近十条 " />
                            <button id="prev" text=" 上一条 " />
                            <button id="next" text=" 下一条 " />
                            <button id="reset" text=" 重置 " />
                        </horizontal>
                        <horizontal gravity="center">
                            <button id="update" text=" 修改 " />
                            <button id="delete" text=" 删除 " />
                            <button id="insert" text=" 新增 " />
                            <button id="updateTikuNet" text=" 更新题库 " />
                        </horizontal>
                        <progressbar id="pbar" indeterminate="true" style="@style/Base.Widget.AppCompat.ProgressBar.Horizontal" />
                        <text id="resultLabel" text="" gravity="center" />
                        <horizontal>
                            <vertical>
                                <text id="questionLabel" text="题目" />
                                <horizontal>
                                    <text id="questionIndex" text="0" />
                                    <text id="slash" text="/" />
                                    <text id="questionCount" text="0" />
                                </horizontal>
                            </vertical>
                            <input margin={margin + "px"} id="question" w="*" h="auto" />
                        </horizontal>
                        <horizontal>
                            <text id="answerLabel" text="答案" />
                            <input id="answer" w="*" h="auto" />
                        </horizontal>
                        <horizontal gravity="center">
                            <button id="listdel" text="清空文章阅读记录" />
                        </horizontal>
                    </vertical>
                </frame>
                <frame>
                    <vertical>
                        <webview id="webview" h="*" w="auto" />
                    </vertical>
                </frame>
            </viewpager>
        </vertical>
    </drawer>
);

//标签名
ui.viewpager.setTitles(["功能", "题库"]);
//联动
ui.tabs.setupWithViewPager(ui.viewpager);

//进度条不可见
ui.run(() => {
    ui.pbar.setVisibility(View.INVISIBLE);
});
//
var config_path="/sdcard/Download/config.json";
var xxset = {
    //定义账号和密码对象集,修改或增加账号数量都可以,数量不大于num
    "users": [{
        "username": "18888888888",   //账号
        "password": "88888888", //密码
    },],
    
    "url": "http://pushplus.hxtrip.com/send", //定义微信推送对象 url+"?token="+token+"&title="+title+"&content="+content
    "token": "de17144cb3be48608fbfea27a5ef0b90", //在pushplus网站登录可以找到自己的token
    "wxpost": 0,    //是否微信推送
    "article": "推荐", //文章阅读类型
    "update2server": 0, //是否上传到远程服务器
    "forever": 0, //是否开启无限答题刷题库
}
//配置文件config
if (files.exists(config_path)) {
    //读取配置文件
    xxset = JSON.parse(files.read(config_path));
    //新增属性wxpost
    if (xxset.wxpost == undefined) {
        //新增属性wxpost
        xxset.wxpost = 1;
        files.write(config_path, JSON.stringify(xxset));
    }

} else {
    //生成配置文件
    files.create("/sdcard/Download/");//创建备份目录
    files.write(config_path, JSON.stringify(xxset));
}

ui.tikuLable.setText("tiku:" + getTikuNum('tiku') +" ,tikuNet:" + getTikuNum('tikuNet'));
//阅读模式切换
ui.amsw.click(() => {
    //var amode = files.read("./article.txt");
    toastLog("当前阅读模式为“" + xxset.article + "”")
    dialogs.select("请选择文章阅读模式：", ["推荐", "订阅"])
        .then(i => {
            if (i == 0) {
                xxset.article = "推荐";
                files.write(config_path, JSON.stringify(xxset));
                //files.write("./article.txt", "推荐")
                toastLog("阅读模式已改为推荐！");
            } else if (i == 1) {
                //files.write("./article.txt", "订阅")
                xxset.article = "订阅";
                files.write(config_path, JSON.stringify(xxset));
                toastLog("阅读模式已改为订阅！");
            } else {
                toastLog("你没有选择！");
            }
        });
});
ui.update2server.click(() => {
    //var amode = files.read("./article.txt");
    toastLog("当前上传" + (xxset.update2server==0?'关闭':'开启'));
    dialogs.select("请选择服务器上传开关：", ["开启", "关闭"])
        .then(i => {
            if (i == 0) {
                xxset.update2server = 1;
                files.write(config_path, JSON.stringify(xxset));
                // files.write("./article.txt", "推荐")
                toastLog("服务器上传开启！")
            } else if (i == 1) {
                xxset.update2server = 0;
                files.write(config_path, JSON.stringify(xxset));
                // files.write("./article.txt", "订阅")
                toastLog("服务器上传关闭！")
            } else {
                toastLog("你没有选择！")
            }
        });
});
ui.forever.click(() => {
    //var amode = files.read("./article.txt");
    toastLog("当前无限答题" + (xxset.forever==0?'关闭':'开启'));
    dialogs.select("请选择无限答题开关：", ["开启", "关闭"])
        .then(i => {
            if (i == 0) {
                xxset.forever = 1;
                files.write(config_path, JSON.stringify(xxset));
                //files.write("./article.txt", "推荐")
                toastLog("无限答题开启")
            } else if (i == 1) {
                xxset.forever = 0;
                files.write(config_path, JSON.stringify(xxset));
                //files.write("./article.txt", "订阅")
                toastLog("无限答题关闭")
            } else {
                toastLog("你没有选择！")
            }
        });
});

//加载悬浮窗
ui.showFloating.click(() => {
    engines.execScriptFile("!floating.js");
});

//查询
ui.search.click(() => {
    //预先初始化
    qaArray = [];
    threads.shutDownAll();
    ui.run(() => {
        ui.question.setText("");
        ui.answer.setText("");
        ui.questionIndex.setText("0");
        ui.questionCount.setText("0");
    });
    //查询开始
    threads.start(function () {
        if (ui.keyword.getText() != "") {
            var keyw = ui.keyword.getText();
            if (ui.rbQuestion.checked) {//按题目搜
                var sqlStr = util.format("SELECT question,answer FROM tiku WHERE %s LIKE '%%%s%'", "question", keyw);
            } else {//按答案搜
                var sqlStr = util.format("SELECT question,answer FROM tiku WHERE %s LIKE '%%%s%'", "answer", keyw);
            }
            qaArray = tikuCommon.searchDb(keyw, "tiku", sqlStr);
            var qCount = qaArray.length;
            if (qCount > 0) {
                ui.run(() => {
                    ui.question.setText(qaArray[0].question);
                    ui.answer.setText(qaArray[0].answer);
                    ui.questionIndex.setText("1");
                    ui.questionCount.setText(String(qCount));
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

//最近十条
ui.lastTen.click(() => {
    threads.start(function () {
        var keyw = ui.keyword.getText();
        qaArray = tikuCommon.searchDb(keyw, "", "SELECT question,answer FROM tiku ORDER BY rowid DESC limit 10");
        var qCount = qaArray.length;
        if (qCount > 0) {
            //toastLog(qCount);
            ui.run(() => {
                ui.question.setText(qaArray[0].question);
                ui.answer.setText(qaArray[0].answer);
                ui.questionIndex.setText("1");
                ui.questionCount.setText(qCount.toString());
            });
        } else {
            toastLog("未找到");
            ui.run(() => {
                ui.question.setText("未找到");
            });
        }
    });
});

//上一条
ui.prev.click(() => {
    threads.start(function () {
        if (qaArray.length > 0) {
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            if (qIndex > 0) {
                ui.run(() => {
                    ui.question.setText(qaArray[qIndex - 1].question);
                    ui.answer.setText(qaArray[qIndex - 1].answer);
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
        if (qaArray.length > 0) {
            //toastLog(qaArray);
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            if (qIndex < qaArray.length - 1) {
                //toastLog(qIndex);
                //toastLog(qaArray[qIndex + 1].question);
                ui.run(() => {
                    ui.question.setText(qaArray[qIndex + 1].question);
                    ui.answer.setText(qaArray[qIndex + 1].answer);
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

//修改
ui.update.click(() => {
    threads.start(function () {
        if (ui.question.getText() && qaArray.length > 0 && parseInt(ui.questionIndex.getText()) > 0) {
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            var questionOld = qaArray[qIndex].question;
            var questionStr = ui.question.getText();
            var answerStr = ui.answer.getText();
            var sqlstr = "UPDATE tiku SET question = '" + questionStr + "' , answer = '" + answerStr + "' WHERE question=  '" + questionOld + "'";
            tikuCommon.executeSQL(sqlstr);
        } else {
            toastLog("请先查询");
        }
    });
});

//删除
ui.delete.click(() => {
    threads.start(function () {
        if (qaArray.length > 0 && parseInt(ui.questionIndex.getText()) > 0) {
            var qIndex = parseInt(ui.questionIndex.getText()) - 1;
            var questionOld = qaArray[qIndex].question;
            var sqlstr = "DELETE FROM tiku WHERE question = '" + questionOld + "'";
            tikuCommon.executeSQL(sqlstr);
        } else {
            toastLog("请先查询");
        }
    });
});

//新增
ui.insert.click(() => {
    threads.start(function () {
        if (ui.question.getText() != "" && ui.answer.getText() != "") {
            var questionStr = ui.question.getText();
            var answerStr = ui.answer.getText();
            var sqlstr = "INSERT INTO tiku VALUES ('" + questionStr + "','" + answerStr + "','')";
            tikuCommon.executeSQL(sqlstr);
        } else {
            toastLog("请先输入 问题 答案");
        }
    });
});

function reset() {

}
//重置
ui.reset.click(() => {
    threads.shutDownAll();
    threads.start(function () {
        qaArray = [];
        ui.run(() => {
            ui.keyword.setText("");
            ui.question.setText("");
            ui.answer.setText("");
            ui.questionIndex.setText("0");
            ui.questionCount.setText("0");
            ui.rbQuestion.setChecked(true);
        });
        toastLog("重置完毕!");
    });
});

//更新网络题库
ui.updateTikuNet.click(() => {
    dialogs.build({
        title: "更新网络题库",
        content: "确定更新？",
        positive: "确定",
        negative: "取消",
    })
        .on("positive", update)
        .show();

    function update() {
        threads.start(function () {
            ui.run(() => {
                ui.resultLabel.setText("正在更新网络题库...");
                ui.pbar.setVisibility(View.VISIBLE);
            });
            var ss = "./updateTikuNet.js";
            let begin = require(ss);
            var resultNum = begin();
            var resultStr = "更新了" + resultNum + "道题！";
            log("更新了" + resultNum + "道题！")
            ui.run(() => {
                ui.resultLabel.setText("");
                ui.pbar.setVisibility(View.INVISIBLE);
                ui.resultLabel.setVisibility(View.INVISIBLE);
            });
            alert(resultStr);
        });
    }
});

ui.listdel.click(() => {
    dialogs.build({
        title: "提示",
        content: "确认清空文章阅读记录吗?",
        positive: "确定",
        negative: "取消",
    }).on("positive", clear)
        .show();
    function clear() {
        var db = SQLiteDatabase.openOrCreateDatabase(path, null);
        var Deletelistable = "DELETE FROM learnedArticles";
        db.execSQL(Deletelistable);
        db.close();
        toastLog("已清空文章阅读记录!");
    }
})

function getTikuNum(tikuName) {
    var db = SQLiteDatabase.openOrCreateDatabase(files.path("/sdcard/Download/tiku.db"), null);
    var cursor = db.rawQuery("select count(*) from " + tikuName, null);
    cursor.moveToFirst()
    return cursor.getString(0)
}