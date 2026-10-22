export const faceProfiles={
 alex:{skin:[177,138,109],hair:'#352f29',eyes:'#697c7e',age:38,seed:501,brow:5,jaw:.86},
 helen:{skin:[192,149,119],hair:'#69513d',eyes:'#618274',age:46,seed:900,brow:2,jaw:.73},
 ruth:{skin:[158,113,86],hair:'#34302b',eyes:'#7e6844',age:54,seed:307,brow:4,jaw:.82},
 elias:{skin:[119,82,65],hair:'#24282a',eyes:'#50462e',age:32,seed:702,brow:3,jaw:.78},
 owen:{skin:[205,157,119],hair:'#8a7356',eyes:'#6a8595',age:58,seed:114,brow:6,jaw:.93},
 viktor:{skin:[185,142,115],hair:'#4a423a',eyes:'#5b686e',age:52,seed:342,brow:5,jaw:.95},
 clara:{skin:[208,168,142],hair:'#755038',eyes:'#607b66',age:29,seed:812,brow:2,jaw:.76},
 bobby:{skin:[168,125,98],hair:'#282420',eyes:'#4b3d32',age:36,seed:629,brow:6,jaw:.90}
};
export const surfaceProfiles={wood:{seed:1,color:[103,77,49]},brick:{seed:2,color:[113,78,63]},plaster:{seed:3,color:[139,145,126]},cloth:{seed:4,color:[107,88,65]},stone:{seed:5,color:[100,111,108]},asphalt:{seed:6,color:[47,62,65]}};
export const materialManifest={version:1,faces:Object.fromEntries(Object.entries(faceProfiles).map(([id,profile])=>[id,{id:`face:${id}`,kind:'face',profile,size:256,maps:null}])),surfaces:Object.fromEntries(Object.entries(surfaceProfiles).map(([id,profile])=>[id,{id:`surface:${id}`,kind:'surface',surface:id,profile,size:128,maps:null}]))};
export function validateDescriptor(d){if(!d||!['face','surface'].includes(d.kind)||!Number.isInteger(d.size)||d.size<32||d.size>2048)throw Error('Invalid NorthVale material descriptor');if(d.maps&&(!d.maps.base||!d.maps.normal||!d.maps.specular||!d.maps.ao))throw Error('A material requires base, normal, specular and ao maps');return d;}
