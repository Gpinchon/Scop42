#version 410
#pragma optionNV (unroll all)
#define	KERNEL_SIZE 5

uniform sampler2D	in_Texture_Color;
uniform sampler2D	in_Texture_Bright;
uniform sampler2D	in_Texture_Normal;
uniform sampler2D	in_Texture_Position;
uniform sampler2D	in_Texture_Depth;
uniform samplerCube	in_Texture_Env;
uniform samplerCube	in_Texture_Env_Spec;

in vec2				frag_UV;
in vec3				frag_Cube_UV;
in float			frag_CenterDepth;

out vec4			out_Color;

uniform float		gaussian_kernel[] = float[KERNEL_SIZE](
	0.06136, 0.24477, 0.38774, 0.24477, 0.06136
);

void main()
{
	vec3	normal = normalize(texture(in_Texture_Normal, frag_UV).xyz);
	vec3	position = texture(in_Texture_Position, frag_UV).xyz;
	float	depth = texture(in_Texture_Depth, frag_UV).r;
	float	dof = min(5, 10.f * abs(frag_CenterDepth - depth));
	vec4	env = textureLod(in_Texture_Env, frag_Cube_UV, 10.f * abs(frag_CenterDepth - 1));
	vec4	color = textureLod(in_Texture_Color, frag_UV, dof);
	float	sampledist = 2.5;
	vec3	finalColor = vec3(0);
	float	occlusion = 0.f;
	if (depth != 1)
	{
		for (int i = 0; i < KERNEL_SIZE; i++) 
		{
			for (int j = 0; j < KERNEL_SIZE; j++) 
			{
				float	weight = gaussian_kernel[i] * gaussian_kernel[j];
				vec2	index = vec2(float(i - KERNEL_SIZE / 2.f), float(j - KERNEL_SIZE / 2.f));
				vec2	sampleUV = frag_UV + index * sampledist / textureSize(in_Texture_Position, 0);
				vec3	samplePosition = texture(in_Texture_Position, sampleUV).xyz;
				if (texture(in_Texture_Depth, sampleUV).r <= depth)
				{
					vec3	V = samplePosition - position;
					float	D = length(V);
					float	bias = 0.25;
					float	factor = max(0, dot(normal, normalize(V)));
					float	angle = max(0, factor - bias);
					occlusion += (angle * (1.f / (1.f + D))) * weight;
				}
			}
		}
	}
	occlusion *= (1 - dof / 5.f);
	finalColor = texture(in_Texture_Bright, frag_UV).rgb + color.rgb * color.a * (1 - occlusion);
	out_Color = (env) * max(0, 1 - color.a);
	out_Color += vec4(finalColor, 1);
	//out_Color.rgb = pow(out_Color.rgb, vec3(1 / 2.2));
	//out_Color = vec4(vec3(1 - occlusion), 1);
}
