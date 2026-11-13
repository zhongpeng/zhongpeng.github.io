import{cp,mkdir}from'node:fs/promises';
const target=new URL('../../../heye/',import.meta.url);await mkdir(target,{recursive:true});await cp(new URL('../public/',import.meta.url),target,{recursive:true});console.log('Heye web preview built at /heye/');
