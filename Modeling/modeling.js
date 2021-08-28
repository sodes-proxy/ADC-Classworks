var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  varying vec4 u_FragColor;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  void main() {
   gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
   u_FragColor = a_Color;
  }`;

var FSHADER_SOURCE =`
  precision mediump float;
  varying vec4 u_FragColor;
  void main(){
    gl_FragColor = u_FragColor;
  }`;

var create_mode=false;
var select_mode=false;
var delete_mode=false;
var gl;
var canvas;
var body;
var create_button;
var select_button;
var delete_button;
var console_area=document.getElementById("console");
function main() {
  canvas = document.getElementById('webgl');
  body = document.getElementsByTagName('body')[0];
  gl = getWebGLContext(canvas,{preserveDrawingBuffer: true});
  create_button=document.getElementById("create_mode");
  select_button=document.getElementById("select_mode");
  delete_button=document.getElementById("delete_mode");

  if (!gl) {
    console.log('Failed to get the WebGL context');
    return;
  }
  //manda a la tarjeta grafica
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to initialize shaders');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  canvas.onmousedown = function (ev) {
    if (ev.buttons == 1) {
      click(ev, gl, canvas);
    }
  }
  fullScreen(gl,canvas);

  //mode buttons functions 
  create_button.onclick=function(){
    create_mode=!create_mode;
    select_mode=false;
    delete_mode=false;
    select_button.style.backgroundColor='#33b5e5';
    delete_button.style.backgroundColor='#33b5e5';
  }
  select_button.onclick=function(){
    select_mode=!select_mode;
    create_mode=false;
    delete_mode=false;
    create_button.style.backgroundColor='#33b5e5';
    delete_button.style.backgroundColor='#33b5e5';
  }
  delete_button.onclick=function(){
    delete_mode=!delete_mode;
    create_mode=false;
    select_mode=false;
    create_button.style.backgroundColor='#33b5e5';
    select_button.style.backgroundColor='#33b5e5';
  }
  
  canvas.oncontextmenu = function (ev) { rightclick(ev, gl); return false; }
  body.onkeydown = function (ev) { depthchange(ev); }
  //window.addEventListener('resize',fullScreen(gl,canvas));
  requestAnimationFrame(update, canvas);
}

function update(){
  if(create_mode){
    create_button.style.backgroundColor='green';
  }
  else if(select_mode){
    select_button.style.backgroundColor='green';
  }
  else if(delete_mode){
    delete_button.style.backgroundColor='green';
  }
  draw(gl);
  requestAnimationFrame(update, canvas);
}
// makes canvas fullscreen
function fullScreen(gl,canvas){
  canvas.style.width ='100%';
  canvas.style.height='100%';
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  gl.viewport(0,0,gl.canvas.width,gl.canvas.height);
  gl.clearColor(0.0,0.0,0.0,1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.POINTS,0,1);
}
function initVertexBuffer(gl, vertices, colores) {
  var n = vertices.length;
  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);

  var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get location of a_Position');
    return;
  }
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);
  var modelMatrix = new Matrix4();
  modelMatrix.setScale(scaleAxis[0],scaleAxis[1],scaleAxis[2]);
  modelMatrix.translate(transAxis[0],transAxis[1],transAxis[2]);
  modelMatrix.rotate(angle, rotAxis[0], rotAxis[1], rotAxis[2]);
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix){ console.log('Failed to get location of u_ModelMatrix'); return;  }
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if(!u_ViewMatrix){ console.log('Failed to get location of u_ViewMatrix'); return;  }
  var viewMatrix = new Matrix4();
  viewMatrix.setLookAt(0.0, 0.0, 1.5, 0.0,0.0,0.0, 0.0,1.0,0.0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if(!u_ProjMatrix){ console.log('Failed to get location of u_ProjMatrix'); return;  }
  var projMatrix = new Matrix4();
  projMatrix.setPerspective(60.0, 1.0, 0.1, 5.0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colores, gl.DYNAMIC_DRAW);
  var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
  if (a_Color < 0) {
    console.log('Failed to get location of u_FragColor');
    return;
  }
  gl.vertexAttribPointer(a_Color, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Color);
  return n;
}

var models=[];
var g_points = [];
var g_colors = [];
var rotAxis = [1,0,0];
var transAxis = [0,0,0];
var scaleAxis = [1,1,1];
var colores=[[1,0,0],[0,1,0],[0,0,1]];
var index = 0;
var z = 0;
var angle = 0.0;
function click(ev, gl, canvas) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();
  //arreglar posicion webgl empieza en el centro, las pagins web de top left
  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
  if(create_mode){
    if (g_points.length <= index) {
      var arrayPoints = [];
      g_points.push(arrayPoints);
      var arrayColors = [];
      g_colors.push(arrayColors);
    }
    g_points[index].push(x);
    g_points[index].push(y);
    g_points[index].push(z);
  
    g_colors[index].push(colores[index][0]);
    g_colors[index].push(colores[index][1]);
    g_colors[index].push(colores[index][2]);
  
    draw(gl);
  }
  else if(select_mode){
    var selected=null;
    for (var i = 0; i < g_points.length; i++) {
      if(isInside(g_points[i][0],g_points[i][1],g_points[i][3],g_points[i][4],g_points[i][6],g_points[i][7],x,y)){
        selected=i;
      }
      if(selected!=null){
        console_area.value+="Selected Figure: "+selected+"\n";
      }
    }
  }
  else if(delete_mode){
    var selected=null;
    for (var i = 0; i < g_points.length; i++) {
      if(isInside(g_points[i][0],g_points[i][1],g_points[i][3],g_points[i][4],g_points[i][6],g_points[i][7],x,y)){
        console.log("está dentro en i:",i);
        selected=i;
      }
    }
    if(selected!=null && g_points.length>1){
      g_points.splice(selected,1);
      index--;
      console.log(g_points);
      selected=null;
    }
    if(selected!=null && g_points.length==1){
      console.log("entró a esto");
      g_points.pop();
      index--;
      console.log(g_points);
    }
    //draw(gl);
  }
}
function draw(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  for (var i = 0; i < g_points.length; i++) {
    var n = initVertexBuffer(gl, new Float32Array(g_points[i]), new Float32Array(g_colors[i])) / 3;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
  }
}
function rightclick(ev, gl) {
  if (g_points[index]) {
    index++;
  }
  draw(gl);
}
function depthchange(ev) {
  if (ev.key == "Shift") {
    console.log(models);
    z = 1;
  }
  else if (ev.key == "Control") {
    z = -1;
  }
}

function isInside(x1, y1, x2, y2, x3, y3, x, y)
{
  var dot1 = (y2 - y1)*(x - x1) + (-x2 + x1)*(y - y1);
  var dot2  = (y3 - y2)*(x - x2) + (-x3 + x2)*(y - y2);
  var dot3 = (y1 - y3)*(x - x3) + (-x1 + x3)*(y - y3);
  return (dot1>=0 && dot2>=0 && dot3>=0);
}
function setValue(slider){
  var transformation=slider.id.split("_");
  var x =document.getElementById(transformation[0]+"_"+transformation[1]);
  if(transformation[0]=="translate" && transformation[1]=="x"){
    x.value=slider.value;
    transAxis[0]=x.value/100;
  }
  if(transformation[0]=="translate" && transformation[1]=="y"){
    x.value=slider.value;
    transAxis[1]=x.value/100;
  }
  if(transformation[0]=="translate" && transformation[1]=="z"){
    x.value=slider.value;
    transAxis[2]=x.value/100;
  }
  if(transformation[0]=="rotate" && transformation[1]=="x"){
    x.value=slider.value;
    rotAxis=[1,0,0];
    angle=x.value;
  }
  if(transformation[0]=="rotate" && transformation[1]=="y"){
    x.value=slider.value;
    rotAxis=[0,1,0];
    angle=x.value;
  }
  if(transformation[0]=="rotate" && transformation[1]=="z"){
    x.value=slider.value;
    rotAxis=[0,0,1];
    angle=x.value;
  }
  if(transformation[0]=="scale" && transformation[1]=="x"){
    x.value=slider.value;
    scaleAxis[0]=x.value/100;
  }
  if(transformation[0]=="scale" && transformation[1]=="y"){
    x.value=slider.value;
    scaleAxis[1]=x.value/100;
  }
  if(transformation[0]=="scale" && transformation[1]=="z"){
    x.value=slider.value;
    scaleAxis[2]=x.value/100;
  }
}