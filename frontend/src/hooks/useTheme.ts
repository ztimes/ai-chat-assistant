import {useCallback, useEffect, useState } from 'react';

export type Theme = "light" | "dark";

const STORAGE_KEY = "chat-theme";


// 读取初始值 本地有选择就是用本地，否则跟随系统
function readTheme():Theme{
    const saved = localStorage.getItem(STORAGE_KEY);
    if(saved === "light" || saved === "dark"){
        return saved;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme(){
    const [theme, setTheme] = useState<Theme>(readTheme);

    // 主题变化时同步到 DOM 和 localstorage
    useEffect(()=>{
        document.documentElement.dataset.theme = theme;
        localStorage.setItem(STORAGE_KEY, theme);
    },[theme]);

    // 主题切换

    const toggle = useCallback(()=>{
        setTheme((t)=>(t ==="dark" ? "light" : "dark"));
    },[]);

    return {theme, toggle};
}