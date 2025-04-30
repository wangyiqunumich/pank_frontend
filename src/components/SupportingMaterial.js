import React, { useEffect, useState } from 'react';
import Slider from "react-slick";
import { Card, CardContent, Typography, IconButton, Box, Container, Stack, Grid } from "@mui/material";
import { ArrowBackIos, ArrowForwardIos } from "@mui/icons-material";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";


// const cardData = [
//   [{
//     title: "Reference",
//     icon: "📑",
//     content: [
//       { text: "Guo et al.", link: "#" },
//       { text: "Koivula et al.", link: "#" },
//       { text: "Di Fulvio et al.", link: "#" },
//     ],
//   },
//   {
//     title: "Volcano Plot",
//     icon: "📊",
//     comment: [{ text: "Link to more detail", link: "#" }],
//     image: "https://placehold.co/600x400/EEE/31343C",
//   },
//   {
//     title: "External Link",
//     icon: "🔗",
//     content: [{ text: "Ensemble", link: "#" }],
//   }],
//   [{
//     title: "Reference",
//     icon: "📑",
//     content: [
//       { text: "Guo et al.", link: "#" },
//       { text: "Koivula et al.", link: "#" },
//       { text: "Di Fulvio et al.", link: "#" },
//     ],
//   },
//   {
//     title: "Volcano Plot",
//     icon: "📊",
//     comment: [{ text: "Link to more detail", link: "#" }],
//     image: "https://placehold.co/600x400/EEE/31343C",
//   },
//   {
//     title: "External Link",
//     icon: "🔗",
//     content: [{ text: "Ensemble", link: "#" }],
//   },],
//   [{
//     title: "Reference",
//     icon: "📑",
//     content: [
//       { text: "Guo et al.", link: "#" },
//       { text: "Koivula et al.", link: "#" },
//       { text: "Di Fulvio et al.", link: "#" },
//     ],
//   },
//   {
//     title: "Volcano Plot",
//     icon: "📊",
//     comment: [{ text: "Link to more detail", link: "#" }],
//     image: "https://placehold.co/600x400/EEE/31343C",
//   },],
// ];


const MaterialCard = ({ data }) => {
  return (
    <Container sx={{
      height: 300,
    }}>
      <Card
        sx={{
          textAlign: "center",
          alignContent: "center",
          borderRadius: 4,
          height: "100%",
          width: "100%",
          bgcolor: "white",
          color: "black",
          display: "flex",
          justifyContent: "center",
          alignItems: "space-between",
        }}
      >
        <CardContent sx={{ width: "100%", p: 2 }}>
          <Typography variant="h5" sx={{ alignSelf: "center", pb: 3, fontWeight: "bold" }}>
            {data.icon} {data.title}
          </Typography>
          {data.image && (
            <Box component="img"
              src={data.image}
              alt={data.title} sx={{
                width: "100%", height: 100, objectFit: "contain", my: 1, display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            />
          )}
          {data.content && data.content.map((link, idx) => (
            <Typography key={idx} variant="body1" sx={{ textAlign: "left", pl: "calc(100%/5)" }}>
              <a href={link.link} style={{ textDecoration: "underline", fontWeight: "bold", color: 'black' }}>
                {idx + 1}. {link.text}
              </a>
            </Typography>
          ))}
          {data.comment && data.comment.map((link, idx) => (
            <Typography key={idx} variant="body1">
              <a href={link.link} style={{ textDecoration: 'underline', color: 'black', fontWeight: "bold" }}>
                {link.text}
              </a>
            </Typography>
          ))}
        </CardContent>
      </Card>
    </Container>
  );
}


function CarouselCards({cardData}) {
  const sliderRef = React.useRef(null);

  const settings = {
    dots: true,
    infinite: cardData.length > 1,
    speed: 500,
    arrows: false,
    slidesToShow: 1,
    slidesToScroll: 1,
    // variableWidth: false,
    // arrows: false,
    // customPaging: (i) => (
    //   <Box
    //     sx={{
    //       width: 10,
    //       height: 10,
    //       bgcolor: "gray",
    //       borderRadius: "50%",
    //       display: "inline-block",
    //       mx: 0.5,
    //       transition: "background-color 0.3s",
    //     }}
    //   />
    // ),
    // appendDots: (dots) => (
    //   <Box sx={{ textAlign: "center", mt: 1 }}>
    //     <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", justifyContent: "center" }}>
    //       {dots.map((dot, index) => (
    //         <li key={index} style={{ margin: "0 5px", display: "inline-block" }}>{dot}</li>
    //       ))}
    //     </ul>
    //   </Box>
    // ),
    // appendDots: (dots) => ( //larger dots
    //  //font size
    // <ul style={{ font-size: "20px" }}>{dots}</ul>
    // ),
  };


  return (
    <Box sx={{ position: "relative", width: '1520px', pb: 2, height: "auto", alignSelf: "center", display: "flex", flexDirection: "row", justifyContent: "center" }}>

      {/* Left Arrow */}
      <IconButton
        disabled={cardData.length <= 1}
        onClick={() => sliderRef.current.slickPrev()}
        sx={{
          // left: 0,
          // top: "50%",
          // transform: "translateY(-50%)",
          position: "absolute",
          top: "160px",
          transform: "translateY(-50%)",
          left: 2,
          width: 50,
          height: 50,
          bgcolor: "white",
          boxShadow: 1,
          zIndex: 10, // Ensure arrows stay above carousel
        }}
      >
        <ArrowBackIos />
      </IconButton>

      {/* Slider */}
      <Container sx={{ width: "1500px", maxWidth: "1500px !important", height: "350px", alignSelf: "center", }}>
        <Slider ref={sliderRef} {...settings}>
          {cardData.map((item, index) => (
            <Stack direction="row" spacing={2} key={index} sx={{
              width: "1500px",
              height: "310px",
              pt: 2,
              display: "flex !important",
              flexDirection: "row !important",
              justifyContent: "center !important",
            }}>
              {item.map((item, index) => (
                <MaterialCard key={index} data={item} />
              ))}
            </Stack>

          ))}
        </Slider>
      </Container>

      {/* Right Arrow */}
      <IconButton
        disabled={cardData.length <= 1}
        onClick={() => sliderRef.current.slickNext()}
        sx={{
          position: "absolute",
          top: "160px",
          transform: "translateY(-50%)",
          right: 2,
          width: 50,
          height: 50,
          bgcolor: "white",
          boxShadow: 1,
          alignSelf: "center",
          zIndex: 10,
        }}
      >
        <ArrowForwardIos />
      </IconButton>
    </Box>
  );
}


export default CarouselCards;
