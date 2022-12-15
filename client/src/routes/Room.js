import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import styled from "styled-components";
import { useParams, useNavigate } from 'react-router-dom';
import '../App.css'

const Container = styled.div`
    padding: 20px;
    display: flex;
    height: 100vh;
    width: 90%;
    margin: auto;
    flex-wrap: wrap;
`;

const StyledVideo = styled.video`
    height: 50%;
    width: 50%;
`;

const Video = (props) => {
    const ref = useRef();

    useEffect(() => {
        props.peer.on("stream", stream => {
            ref.current.srcObject = stream;
        })
    }, []);

    return (
        <video playsInline autoPlay ref={ref} controls class="videoclass"/>
    );
}


const videoConstraints = {
    height: window.innerHeight / 2,
    width: window.innerWidth / 2
};

const Room = (props) => {
    const [peers, setPeers] = useState([]);
    const socketRef = useRef();
    const userVideo = useRef();
    const peersRef = useRef([]);
    // const roomID = props.match.params.roomID;
    const {roomID} = useParams();
    const userStream = useRef();


    const [isAudio, setIsAudio] = useState(true)
    const [isVideo, setIsVideo] = useState(true)
    const [isShareScreen, setIsShareScreen] = useState(false)
    let navigate = useNavigate();

    useEffect(() => {
        socketRef.current = io.connect("/");
        navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: true }).then(stream => {
            userStream.current = stream;

            userVideo.current.srcObject = stream;
            socketRef.current.emit("join room", roomID);
            socketRef.current.on("all users", users => {
                const newpeers = [];
                users.forEach(userID => {
                    const peer = createPeer(userID, socketRef.current.id, stream);
                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    })
                    
                    newpeers.push({
                        peerID: userID,
                        peer,
                    });
                })
                setPeers(newpeers);
            })

            socketRef.current.on("user joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                })
                const peerObj = {
                    peer,
                    peerID: payload.callerID
                }

                setPeers(users => [...users, peerObj]);

            });

            socketRef.current.on("receiving returned signal", payload => {
                const item = peersRef.current.find(p => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

            socketRef.current.on("room full", () => {
                alert("Room Full. Room could have maximum 4 members. Join another room.")
                navigate("/")
            })

            socketRef.current.on("user left", id => {
                const peerObj = peersRef.current.find(p => p.peerID === id)
                if(peerObj){
                    peerObj.peer.destroy()
                }
                const allpeers = peersRef.current.filter(p => p.peerID !== id)
                peersRef.current = allpeers
                setPeers([...allpeers])

            })
        }).catch(err => {
            console.log(err)
            alert("Please allow audio/video")
            setIsAudio(false)
            setIsVideo(false)
        })
    }, []);

    function createPeer(userToSignal, callerID, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", signal => {
            socketRef.current.emit("sending signal", { userToSignal, callerID, signal })
        })

        return peer;
    }

    function addPeer(incomingSignal, callerID, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        })

        peer.on("signal", signal => {
            socketRef.current.emit("returning signal", { signal, callerID })
        })

        peer.signal(incomingSignal);

        return peer;
    }

    const videoToggle = () => {
        // console.log(userStream)
        const videoTrack = userStream.current.getTracks().find(track => track.kind === 'video')
        if(videoTrack.enabled){
            // videoTrack.stop()
            videoTrack.enabled = false
            setIsVideo(false)
        }else{
            videoTrack.enabled = true
            setIsVideo(true)
            // // console.log("hii")
            // navigator.mediaDevices.getUserMedia({ video:videoConstraints ,audio:isAudio }).then(stream => {
            //     userStream.current = stream
            //     userVideo.current.srcObject = stream;

            // const newAudioTrack = userStream.current.getTracks().find(track => track.kind === 'audio')
            // const newVideoTrack = userStream.current.getTracks().find(track => track.kind === 'video')
            // peersRef.current.map(p => {
            //     p.peer.replaceTrack(
            //         p.peer.streams[0].getAudioTracks()[0],
            //         newAudioTrack,
            //         p.peer.streams[0]
            //       )

            //     p.peer.replaceTrack(
            //     p.peer.streams[0].getVideoTracks()[0],
            //     newVideoTrack,
            //     p.peer.streams[0]
            //     )
            // })
            // })
        }
    }

    const audioToggle = () => {
        // console.log(userStream)
        const audioTrack = userStream.current.getTracks().find(track => track.kind === 'audio')
        if(audioTrack.enabled){
            // audioTrack.stop()
            audioTrack.enabled = false
            setIsAudio(false)
        }else{
            audioTrack.enabled = true
            setIsAudio(true)
            // navigator.mediaDevices.getUserMedia({ video:isVideo ,audio:true }).then(stream => {
            //     userStream.current = stream
            //     userVideo.current.srcObject = stream;

            // const newAudioTrack = userStream.current.getTracks().find(track => track.kind === 'audio')
            // const newVideoTrack = userStream.current.getTracks().find(track => track.kind === 'video')
            // peersRef.current.map(p => {
            //     p.peer.replaceTrack(
            //         p.peer.streams[0].getAudioTracks()[0],
            //         newAudioTrack,
            //         p.peer.streams[0]
            //       )

            //     p.peer.replaceTrack(
            //     p.peer.streams[0].getVideoTracks()[0],
            //     newVideoTrack,
            //     p.peer.streams[0]
            //     )
            // })
            // })
        }
    }

    function shareScreen() {
        navigator.mediaDevices.getDisplayMedia({ cursor: true }).then(stream => {
            const screenTrack = stream.getTracks()[0];

            peersRef.current.map(p => {
                p.peer.replaceTrack(
                    p.peer.streams[0].getVideoTracks()[0],
                    screenTrack,
                    p.peer.streams[0]
                  )
            })

            setIsShareScreen(true)

            screenTrack.onended = function() {

                peersRef.current.map(p => {
                    p.peer.replaceTrack(
                        p.peer.streams[0].getVideoTracks()[0],
                        userStream.current.getTracks()[1],
                        p.peer.streams[0]
                      )
                })
                setIsShareScreen(false)
            }
        })
    }

    return (
        <div>
            <div>
                <center>
                <h1>MERN Video chat using webrtc.</h1>
                <button onClick={() => videoToggle()} style={{color:isVideo?"green":"red", cursor:"pointer", fontSize:"18px"}}>Video {isVideo?"(On)":"(Off)"}</button>
                <button onClick={() => audioToggle()} style={{color:isAudio?"green":"red", cursor:"pointer", fontSize:"18px"}}>Audio {isAudio?"(On)":"(Off)"}</button>
                <button onClick={() => shareScreen()} style={{color:isShareScreen?"green":"black", cursor:"pointer", fontSize:"18px"}}>Share screen {isShareScreen?"(On)":"(Off)"}</button>
                </center>
            </div>
        <Container>
            <video muted ref={userVideo} autoPlay playsInline class="videoclass"/>
            {peers.map((peer) => {
                return (
                    <Video key={peer.peerID} peer={peer.peer} />
                );
            })}
        </Container>
        </div>
    );
};

export default Room;