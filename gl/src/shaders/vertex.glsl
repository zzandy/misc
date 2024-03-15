attribute vec4 a_position;
attribute vec4 a_color;
uniform mat4 u_view;
uniform mat4 u_trans;
varying vec4 v_color;

void main(){
    gl_Position = u_view * u_trans * a_position;
    v_color = a_color;
}
