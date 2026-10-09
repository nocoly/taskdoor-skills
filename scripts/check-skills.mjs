import {readdirSync,readFileSync,statSync} from 'node:fs';
import {resolve,dirname,relative,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../skills');
const walk=directory=>readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{
  const path=resolve(directory,entry.name);
  if(entry.isSymbolicLink())throw Error('Skill 必须包含真实文件，不能依赖外部符号链接：'+path);
  return entry.isDirectory()?walk(path):[path];
});
let count=0;
for(const entry of readdirSync(root,{withFileTypes:true}).filter(entry=>entry.isDirectory())){
  const directory=resolve(root,entry.name);
  const text=readFileSync(resolve(directory,'SKILL.md'),'utf8');
  const frontmatter=text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
  if(!frontmatter)throw Error('缺少 Skill frontmatter：'+entry.name);
  const name=frontmatter.match(/^name:\s*([^\r\n]+)$/m)?.[1].replace(/^['"]|['"]$/g,'');
  if(name!==entry.name||!name||name.length>64||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))throw Error('Skill 名称与目录不匹配：'+entry.name);
  if(!/^description:\s*\S/m.test(frontmatter))throw Error('缺少 Skill description：'+entry.name);
  const files=walk(directory);
  for(const file of files.filter(file=>file.endsWith('.md'))){
    for(const match of readFileSync(file,'utf8').matchAll(/\[[^\]]*\]\(([^)]+)\)/g)){
      const target=match[1].replace(/^<|>$/g,'').split('#')[0];
      if(!target||/^[a-z][a-z0-9+.-]*:/i.test(target))continue;
      const destination=resolve(dirname(file),decodeURIComponent(target));
      const path=relative(directory,destination);
      if(path==='..'||path.startsWith('../')||isAbsolute(path))throw Error('引用超出可独立安装的 Skill：'+file+' → '+target);
      if(!statSync(destination).isFile())throw Error('引用不是文件：'+destination);
    }
  }
  console.log(`${name}: ${files.length} 个文件，所有本地引用可独立读取`);
  count++;
}
if(!count)throw Error('没有发现 Skill');
