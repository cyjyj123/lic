#!/usr/bin/env node
const fs=require("fs");

let credits_text=""; // 致谢文本
let lics_abs=[];  // 所有能够识别到的模块的许可信息以及不能识别到的模块的原因

// 得到
function getLicenseFileName(dirs){
    // dirs为模块根路径的目录和文件数组
    for(let i=0;i<dirs.length;i++){
        const resp=dirs[i].match(/license/i);
        if(resp!=null){
            return resp["input"];
        }
    }
    // 不存在LICENSE文件时，返回null
    return null;
}

function readALicense(module_name,group_name=undefined){
    let lic;
    let title_name; // 模块名称
    let basepath; // 基于node_modules同级目录的模块基础路径
    if(group_name==undefined){
        // 不在组中的，直接位于node_modules中的
        title_name=module_name;
        basepath="./node_modules/"+module_name;
    }else{
        // 在node_modules的某个以@开头的组中的
        title_name=group_name+"/"+module_name;
        basepath="./node_modules/"+group_name+"/"+module_name;
    }

    const files_in_module=fs.readdirSync(basepath); // 读取当前模块根路径中的目录和文件
    const lic_file_name=getLicenseFileName(files_in_module); // 获得可能的许可证文件名称

    let now=null; // 当前模块的基本许可信息
    if(lic_file_name!=null && fs.existsSync(basepath+"/"+lic_file_name)){
        // 如果该模块有LICENSE文件，则写入致谢
        lic=fs.readFileSync(basepath+"/"+lic_file_name).toString();
        credits_text+=`${title_name}\n${lic}\n\n`;
        now={name:title_name}
        const matched=lic.match(/MIT|Apache|BSC|ISC|GPL/ig);
        if(matched==null){
            now.license=undefined;
            now.reason="未从具体信息中识别出许可类别";
        }else{
            now.license=matched[0];
        }
    }else if(fs.existsSync(basepath+"/"+"package.json")){
        // 如果上述文件不存在，则查询package.json中的字段
        const pkg_info=JSON.parse(fs.readFileSync(basepath+"/"+"package.json").toString());
        lic=pkg_info.license;
        now={name:title_name,license:lic};
        if(lic==undefined || lic==""){
            // 如果依然识别不到，则放入格式不标准数组中
            now.reason="package.json不含license字段";
        }else{
            if(pkg_info.author!=undefined){
                credits_text+=`${title_name}\n${lic}\nCopyright (C) ${pkg_info.author}\n\n`;
            }else{
                now.reason="作者无法识别";
            }
        }
    }else{
        // 不标准的模块
        now={name:title_name,reason:"格式不标准"};
    }

    lics_abs.push(now)
}

function readAGroup(group_name){
    const modules_in_group=fs.readdirSync("./node_modules/"+group_name);
    for(let i=0;i<modules_in_group.length;i++){
        readALicense(modules_in_group[i],group_name);
    }
}

function main(){
    // 遍历node_module，以@开头遍历其中的
    if(!fs.existsSync("./node_modules")){
        console.log("请在具有node_modules目录的目录中运行");
        return;
    }

    const modules=fs.readdirSync("./node_modules");
    for(let i=0;i<modules.length;i++){
        if(modules[i].startsWith("@")){
            // 遍历其中的模块
            readAGroup(modules[i]);
        }else if(modules[i].startsWith(".")){}else{
            readALicense(modules[i]);
        }
    }

    if(process.argv.includes("show")){
        // 显示需要人工检查的模块
        let unwrite=[]; // 未写明协议的模块，人工检查
        for(let i=0;i<lics_abs.length;i++){
            if(lics_abs[i].license==undefined || lics_abs[i].reason!=undefined || lics_abs[i].license.trim().match(/gpl/ig)!=null){
                unwrite.push({name:lics_abs[i].name,license:lics_abs[i].license,reason:lics_abs[i].reason});
            }
        }
        console.log("需要人工检查的模块",unwrite);
        console.log("共计",unwrite.length,"项");
    }else if(process.argv.includes("verbose")){
        // 显示模块的识别状况
        console.log(lics_abs);
    }else{
        fs.writeFileSync("./credits.txt",credits_text);
        console.log("写入文件完成");
    }
}

main();
