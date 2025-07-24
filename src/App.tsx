import { App } from 'obsidian'; 
import { createContext } from 'react';
import { useContext } from 'react';
import { SyntaxTree } from 


export const AppContext = createContext<App | undefined>(undefined); 
