import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import 'antd/dist/reset.css';
import { TweenOneGroup } from "rc-tween-one";
import {Input, Col, Row, Spin, Tag, Menu} from 'antd';
import './scoped.css'
import GLKBLogoImg from '../../img/glkb_logo.png'
import UMLogo from '../../img/um_logo.jpg'
import MedSchoolLogo from '../../img/MedSchoolLogo.png'
import { DingtalkCircleFilled } from '@ant-design/icons';
import NavBar from '../NavBar';
import NavBarWhite from '../Units/SearchBarKnowledge'
import SearchBarKnowledge from "../Units/SearchBarKnowledge";
import logo from "../../img/logo.svg";
import umLogo from "../../img/um_logo.jpg";
import {TestComponent} from "../Test/TestComponent";


const { Search } = Input;

const HomePage = () => {
    let nevigate = useNavigate();
    const handleSearch = async (v) => {
        nevigate(`/result?q=${v}`)
    }

    const [tags, setTags] = useState([]);

    return (
        <div className="HomePageContainer">
            {/*<NavBar*/}
            {/*    handleSearchTags = {handleSearch}*/}
            {/*    tags = {tags}*/}
            {/*    setTags = {setTags}*/}
            {/*/>*/}
            {/* <NavBarWhite/> */}
            {/*<div className="content">*/}
            {/*    <img src={logo}  alt="Logo" />*/}
            {/*    <SearchBarKnowledge */}
            {/*        chipData = {[]}*/}
            {/*    />*/}
            {/*</div>*/}
            <div>
                fdsa
                <TestComponent/>
            </div>
            {/*<div className="footer">*/}
            {/*    <img src={umLogo} alt="Michigan Medicine Logo" className="footer-img" />*/}
            {/*    <p>© 2022 U-M Liu Lab, Department of Computational Medicine and Bioinformatics</p>*/}
            {/*</div>*/}
        </div>
    )
}


export default HomePage