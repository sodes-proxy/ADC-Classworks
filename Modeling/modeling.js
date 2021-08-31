/*
* @author: Sebastián Ochoa Osuna
* note: I left some lines commented because I tried to implement the picker with click, but unfortunately
* it became a lot more complicated than anticipated, but I left it, if you wanted to try it out
*/

var VSHADER_SOURCE =`
  attribute vec4 a_Position;
  attribute vec4 a_Color;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  void main() {
   gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
  }`;

var FSHADER_SOURCE =`
  precision mediump float;
  uniform vec4 u_FragColor;
  void main(){
    gl_FragColor = u_FragColor;
  }`;
 /* 
 Global variables declaration
 */
var create_mode=false;
var select_mode=false;
//var delete_mode=false;
var camera_mode=false;
var gl;
var canvas;
var body;
var create_button;
var select_button;
//var delete_button;
var camera_button;
var selected;
var console_area=document.getElementById("console");
var figures=document.getElementById("figures");

function main() {
  canvas = document.getElementById('webgl');
  body = document.getElementsByTagName('body')[0];
  gl = getWebGLContext(canvas,{preserveDrawingBuffer: true});
  create_button=document.getElementById("create_mode");
  select_button=document.getElementById("select_mode");
  //delete_button=document.getElementById("delete_mode");
  camera_button=document.getElementById("camera_mode");

  if (!gl) {
    console.log('Failed to get the WebGL context');
    return;
  }
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
    //delete_mode=false;
    camera_mode=false;
    select_button.style.backgroundColor='#33b5e5';
    //delete_button.style.backgroundColor='#33b5e5';
    camera_button.style.backgroundColor='#33b5e5';
    document.getElementById("Creation").style.display="inline";
    document.getElementById("Transformations").style.display="None";
    document.getElementById("Camera").style.display="None";
    var color=document.getElementById("surface_color").value;
    hexToRgb(color);
  }
  select_button.onclick=function(){
    select_mode=!select_mode;
    create_mode=false;
   // delete_mode=false;
    camera_mode=false;
    create_button.style.backgroundColor='#33b5e5';
    camera_button.style.backgroundColor='#33b5e5';
    //delete_button.style.backgroundColor='#33b5e5';
    document.getElementById("Creation").style.display="none";
    document.getElementById("Camera").style.display="None";
    document.getElementById("Transformations").style.display="inline";
    updateSelect();
  }
  /*delete_button.onclick=function(){
    delete_mode=!delete_mode;
    create_mode=false;
    select_mode=false;
    camera_mode=false;
    create_button.style.backgroundColor='#33b5e5';
    camera_button.style.backgroundColor='#33b5e5';
    select_button.style.backgroundColor='#33b5e5';
    document.getElementById("Transformations").style.display="none";
    document.getElementById("Creation").style.display="None";
    document.getElementById("Camera").style.display="None";
  }*/
  camera_button.onclick=function(){
    camera_mode=!camera_mode;
    create_mode=false;
    select_mode=false;
    //delete_mode=false;
    create_button.style.backgroundColor='#33b5e5';
    //delete_button.style.backgroundColor='#33b5e5';
    select_button.style.backgroundColor='#33b5e5';
    document.getElementById("Transformations").style.display="none";
    document.getElementById("Creation").style.display="None";
    document.getElementById("Camera").style.display="inline";
  }
  
  canvas.oncontextmenu = function (ev) { rightclick(ev, gl); return false; }
  body.onkeydown = function (ev) { depthchange(ev); }
  window.addEventListener('resize',fullScreen(gl,canvas));
  requestAnimationFrame(update, canvas);
}

function update(){
  if(create_mode){
    create_button.style.backgroundColor='green';
  }
  else if(select_mode){
    select_button.style.backgroundColor='green';
  }
  /*else if(delete_mode){
    delete_button.style.backgroundColor='green';
  }*/
  else if(camera_mode){
    camera_button.style.backgroundColor='green';
  }
  if( console_area.value.split(/\r\n|\r|\n/).length>4){
    console_area.value="";
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
/**
 * Loads data to draw with webgl
 * @param vertices coordinates of vertex points
 * @param index index of surface to be created
 * @return number of vertices
 */
function initVertexBuffer(gl, vertices,index) {
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
  modelMatrix.setScale(scaleAxis[index][0],scaleAxis[index][1],scaleAxis[index][2]);
  modelMatrix.translate(transAxis[index][0],transAxis[index][1],transAxis[index][2]);
  modelMatrix.rotate(angles[index][0], 1, 0,0);
  modelMatrix.rotate(angles[index][1], 0, 1,0);
  modelMatrix.rotate(angles[index][2], 0, 0,1);
  var u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix){ console.log('Failed to get location of u_ModelMatrix'); return;  }
  gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);

  var u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if(!u_ViewMatrix){ console.log('Failed to get location of u_ViewMatrix'); return;  }
  var viewMatrix = new Matrix4();
  viewMatrix.setLookAt(view_eye[0],view_eye[1], view_eye[2], reference_center[0],reference_center[1],reference_center[2], 0.0,1.0,0.0);
  gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);

  var u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  if(!u_ProjMatrix){ console.log('Failed to get location of u_ProjMatrix'); return;  }
  var projMatrix = new Matrix4();
  projMatrix.setPerspective(60.0, 1.0, 0.1, 5.0);
  gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

  var u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }
  gl.uniform4f(u_FragColor, g_colors[index][0], g_colors[index][1],g_colors[index][2], 1);
  return n;
}
/*
Settings variables that will be changed with the interface
*/
var currentColor=[];
var g_points = [];
var g_colors = [];
var transAxis = [];
var scaleAxis = [];
var index = 0;
var z = 0;
var angles = [];
var view_eye=[0.0,0.0,1.5];
var reference_center=[0.0,0.0,0.0];

/*
reads position of click and sends the information to the settings array
*/
function click(ev, gl, canvas) {
  var x = ev.clientX;
  var y = ev.clientY;
  var rect = ev.target.getBoundingClientRect();
  x = ((x - rect.left) - canvas.width / 2) / (canvas.width / 2);
  y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);
  if(create_mode){
    if (g_points.length <= index) {
      var arrayPoints = [];
      g_points.push(arrayPoints);
      var arrayColors = [];
      g_colors.push(arrayColors);
      var arrayTranslations = [];
      transAxis.push(arrayTranslations);
      var arrayScales = [];
      scaleAxis.push(arrayScales);
      var arrayAngles = [];
      angles.push(arrayAngles);
    }
    g_points[index].push(x);
    g_points[index].push(y);
    g_points[index].push(z);
  
    g_colors[index].push(currentColor[0]);
    g_colors[index].push(currentColor[1]);
    g_colors[index].push(currentColor[2]);

    transAxis[index].push(0);
    transAxis[index].push(0);
    transAxis[index].push(0);

    scaleAxis[index].push(1);
    scaleAxis[index].push(1);
    scaleAxis[index].push(1);

    angles[index].push(0.0);
    angles[index].push(0.0);
    angles[index].push(0.0);
    draw(gl);
  }
  /* tried to add a selection via click, but it stopped working when the figure got a transformation
  else if(select_mode){
    selected=null;
    for (var i = 0; i < g_points.length; i++) {
      if(isInside(g_points[i][0],g_points[i][1],g_points[i][3],g_points[i][4],g_points[i][6],g_points[i][7],x,y)){
        selected=i;
      }
    }
    if(selected!=null){
      g_colors[selected]=currentColor;
      console_area.value+="Selected Figure: "+selected+"\n";
    }
    else{
      console_area.value+="You are no longer selecting a figure\n";
    }
  }*/
  /* Same here but with the deletion
  else if(delete_mode){
    selected=null;
    for (var i = 0; i < g_points.length; i++) {
      if(isInside(g_points[i][0],g_points[i][1],g_points[i][3],g_points[i][4],g_points[i][6],g_points[i][7],x,y)){
        selected=i;
      }
    }
    if(selected!=null && g_points.length>1){
      g_points.splice(selected,1);
      index--;
      console_area.value+="Deleted Figure: "+selected+"\n";
      selected=null;
    }
    if(selected!=null && g_points.length==1){
      g_points.pop();
      index=0;
      console_area.value+="Deleted Figure: "+selected+"\n";
    }
    //draw(gl);
  }*/
}

/*
Draws the information sent to the init vertex buffer
*/
function draw(gl) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  for (var i = 0; i < g_points.length; i++) {
    var n = initVertexBuffer(gl, new Float32Array(g_points[i]),i) / 3;
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, n);
  }
}
/*
Changes index (allows creation of diferent surface)
*/
function rightclick(ev, gl) {
  if (g_points[index] && scaleAxis[index] && transAxis[index] && angles[index]) {
    index++;
    console_area.value+="new surface\n";
  }
  draw(gl);
}

function depthchange(ev) {
  if (ev.key == "Shift") {
    z = -1;
    console_area.value+="z depth = -1\n";
  }
  else if (ev.key == "Control") {
    z = -0.5;
    console_area.value+="z depth = -0.5\n";

  }
}

/* checked if the click is inside the surface (triangle), stopped using it because I used g_points and when 
a transformation happened it stopped working accordingly (g_points didn't change)
function isInside(x1, y1, x2, y2, x3, y3, x, y)
{
  var dot1 = (y2 - y1)*(x - x1) + (-x2 + x1)*(y - y1);
  var dot2  = (y3 - y2)*(x - x2) + (-x3 + x2)*(y - y2);
  var dot3 = (y1 - y3)*(x - x3) + (-x1 + x3)*(y - y3);
  return (dot1>=0 && dot2>=0 && dot3>=0);
}*/

/*
Tried to make something scalable.
function for the sliders when changing value, with the id, checks which slider is being changed
and asigns the value accordingly.
Maybe it was better to make a function for each slider.
*/
function setValue(slider){
  var transformation=slider.id.split("_");
  var x =document.getElementById(transformation[0]+"_"+transformation[1]);
  if(transformation[0]=="translate" && transformation[1]=="x"){
    x.value=slider.value;
    transAxis[selected][0]=x.value/100;
  }
  if(transformation[0]=="translate" && transformation[1]=="y"){
    x.value=slider.value;
    transAxis[selected][1]=x.value/100;
  }
  if(transformation[0]=="translate" && transformation[1]=="z"){
    x.value=slider.value;
    transAxis[selected][2]=x.value/100;
  }
  if(transformation[0]=="rotate" && transformation[1]=="x"){
    x.value=slider.value;
    angles[selected][0]=x.value;
  }
  if(transformation[0]=="rotate" && transformation[1]=="y"){
    x.value=slider.value;
    angles[selected][1]=x.value;
  }
  if(transformation[0]=="rotate" && transformation[1]=="z"){
    x.value=slider.value;
    angles[selected][2]=x.value;
  }
  if(transformation[0]=="scale" && transformation[1]=="x"){
    x.value=slider.value;
    scaleAxis[selected][0]=x.value/100;
  }
  if(transformation[0]=="scale" && transformation[1]=="y"){
    x.value=slider.value;
    scaleAxis[selected][1]=x.value/100;
  }
  if(transformation[0]=="scale" && transformation[1]=="z"){
    x.value=slider.value;
    scaleAxis[selected][2]=x.value/100;
  }
  if(transformation[0]=="eye" && transformation[1]=="x"){
    x.value=slider.value;
    view_eye[0]=x.value/50;
  }
  if(transformation[0]=="eye" && transformation[1]=="y"){
    x.value=slider.value;
    view_eye[1]=x.value/50;
  }
  if(transformation[0]=="eye" && transformation[1]=="z"){
    x.value=slider.value;
    view_eye[2]=x.value/50;
  }
  if(transformation[0]=="center" && transformation[1]=="x"){
    x.value=slider.value;
    reference_center[0]=x.value/100;
  }
  if(transformation[0]=="center" && transformation[1]=="y"){
    x.value=slider.value;
    reference_center[1]=x.value/100;
  }
  if(transformation[0]=="center" && transformation[1]=="z"){
    x.value=slider.value;
    reference_center[2]=x.value/100;
  }
}
/*extracted from https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
gets hexadecimal value of color picker and converts it to float
*/
function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  var red=parseInt(result[1], 16)/255.0;
  var green=parseInt(result[2], 16)/255.0;
  var blue=parseInt(result[3], 16)/255.0;
  currentColor=[red,green,blue];
  console_area.value+="["+currentColor+"] rgb selected\n";
  g_colors[selected]=currentColor; 
}
// changes selected to match the current surface
function selectFigure(select) {
  selected=select.value; 
  console_area.value+="Figure selected "+selected+"\n";
}
// removes information at the index (of the selected surface)
function deleteFigure() {
  if(selected!=null && g_points.length>1){
    g_points.splice(selected,1);
    g_colors.splice(selected,1);
    transAxis.splice(selected,1);
    scaleAxis.splice(selected,1);
    angles.splice(selected,1);
    index--;
    console_area.value+="Deleted Figure: "+selected+"\n";
    selected=null;
  }
  if(selected!=null && g_points.length==1){
    g_points.pop();
    g_colors.pop();
    transAxis.pop();
    scaleAxis.pop();
    angles.pop();
    index=0;
    console_area.value+="Deleted Figure: "+selected+"\n";
    selected=null;
  }
 figures.options[figures.selectedIndex].remove();
}
// check if value is numerical
function updateInput(input){
  if (isNaN(input.value)){
    input.value="";
    console_area.value+="Please introduce a number\n";
  }
  else{
    setValue(input);
  }
}
// introduces options to the select to match the number of surfaces
function updateSelect() {
  for (var i=0;i<g_points.length;i++){
    figures.options[i+1] = new Option('Surface' +i, i);
  }
}