### 网易公开课视频和字幕下载

##### 使用方式

    $ npm install
    $ node app.js -l url

url 为课程地址，如：`http://open.163.com/special/financialmarkets/`

##### 地址解析

网易公开课视频地址有2种不同的方式，我只解析出了其中一种，所以最后用了[硕鼠](http://www.flvcd.com/parse.php)来解析

`index.js` 有原本的获取地址方式，在某些公开课里是可以用的

PS：async/await 真难看